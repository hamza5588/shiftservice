from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, date
from facturatie import fake_facturen_db
from planning import fake_shifts_db
from betalingsherinneringen import send_payment_reminders
from tarieven import fake_tarieven_db  # Tarieven per pas-type
import holidays
import io
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

# BTW-percentage
VAT_PERCENTAGE = 0.21

# Gebruik python-holidays voor Nederland voor meerdere jaren
nl_holidays = holidays.Netherlands(years=[2025, 2026, 2027])


def calculate_shift_hours(start_time, end_time):
    def minutes(t):
        return t.hour * 60 + t.minute

    s = minutes(start_time)
    e = minutes(end_time)
    if e <= s:
        e += 24 * 60

    def overlap(a_start, a_end, b_start, b_end):
        return max(0, min(a_end, b_end) - max(a_start, b_start))

    day_start, day_end = 6 * 60, 22 * 60  # 06:00 - 22:00
    evening_start, evening_end = 22 * 60, 24 * 60  # 22:00 - 24:00
    night_end = 6 * 60  # 00:00 - 06:00

    day_minutes = overlap(s, e, day_start, day_end)
    evening_minutes = overlap(s, e, evening_start, evening_end)
    night_part1 = 0
    if e > 24 * 60:
        night_part1 = overlap(s, e, 24 * 60, 24 * 60 + night_end)
    night_minutes = night_part1 + overlap(s, e, 0, night_end)
    return day_minutes / 60.0, evening_minutes / 60.0, night_minutes / 60.0


def generate_invoices():
    print("{} - Scheduled job: Generating invoices...".format(datetime.now()), flush=True)
    # Groepeer shifts per locatie
    locations = {}
    for shift in fake_shifts_db:
        loc = shift["location"]
        if loc not in locations:
            locations[loc] = []
        locations[loc].append(shift)

    global next_factuur_id
    for loc, shifts in locations.items():
        total_amount = 0.0
        invoice_text = ""
        # We koppelen facturen aan opdrachtgever_id 1 in dit voorbeeld
        opdrachtgever_id = 1
        for shift in shifts:
            # Bepaal de shift_date als date-object
            shift_date = shift["shift_date"]
            if isinstance(shift_date, str):
                shift_date = date.fromisoformat(shift_date)
            # Controleer of de shift op een weekend valt
            is_weekend = (shift_date.weekday() in [5, 6])
            # Controleer of de shift op een feestdag valt (dan geldt de feestdag-toeslag)
            is_holiday = (shift_date in nl_holidays)
            # Indien de shift op een feestdag valt, gebruiken we de feestdag-toeslag (50% toeslag)
            # Hierbij nemen we het volledige totaal aantal uren.
            if is_holiday:
                holiday_rate = None
                if shift.get("required_profile"):
                    for tarief in fake_tarieven_db:
                        if tarief.get("pas_type", "").lower() == shift["required_profile"].lower():
                            if tarief.get("opdrachtgever_id") != opdrachtgever_id:
                                continue
                            if tarief.get("location") and tarief["location"].lower() != loc.lower():
                                continue
                            holiday_rate = tarief["hourly_rate"] * 1.50
                            break
                if holiday_rate is None:
                    holiday_rate = 20.0 * 1.50  # fallback
                total_hours = sum(calculate_shift_hours(shift["start_time"], shift["end_time"]))
                shift_total = total_hours * holiday_rate
                invoice_text += "Datum: {} (Feestdag)\n".format(shift["shift_date"])
                locatie_titel = shift.get("titel") if shift.get("titel") else loc
                invoice_text += "Locatie: {}\n".format(locatie_titel)
                invoice_text += "Totaal uren: {:.2f} uur x €{:.2f} = €{:.2f}\n\n".format(total_hours, holiday_rate,
                                                                                         shift_total)
            elif is_weekend:
                # Weekend: toeslag 35%
                base_rate = None
                if shift.get("required_profile"):
                    for tarief in fake_tarieven_db:
                        if tarief.get("pas_type", "").lower() == shift["required_profile"].lower():
                            if tarief.get("opdrachtgever_id") != opdrachtgever_id:
                                continue
                            if tarief.get("location") and tarief["location"].lower() != loc.lower():
                                continue
                            base_rate = tarief["hourly_rate"]
                            break
                if base_rate is None:
                    base_rate = 20.0
                total_hours = sum(calculate_shift_hours(shift["start_time"], shift["end_time"]))
                weekend_rate = base_rate * 1.35
                shift_total = total_hours * weekend_rate
                invoice_text += "Datum: {} (Weekend)\n".format(shift["shift_date"])
                locatie_titel = shift.get("titel") if shift.get("titel") else loc
                invoice_text += "Locatie: {}\n".format(locatie_titel)
                invoice_text += "Totaal uren: {:.2f} uur x €{:.2f} = €{:.2f}\n\n".format(total_hours, weekend_rate,
                                                                                         shift_total)
            else:
                # Weekdagdienst: gebruik uitsplitsing dag-, avond- en nachturen
                base_rate = None
                if shift.get("required_profile"):
                    for tarief in fake_tarieven_db:
                        if tarief.get("pas_type", "").lower() == shift["required_profile"].lower():
                            if tarief.get("opdrachtgever_id") != opdrachtgever_id:
                                continue
                            if tarief.get("location") and tarief["location"].lower() != loc.lower():
                                continue
                            base_rate = tarief["hourly_rate"]
                            break
                if base_rate is None:
                    base_rate = 20.0
                day_hours, evening_hours, night_hours = calculate_shift_hours(shift["start_time"], shift["end_time"])
                day_rate = base_rate  # 100%
                evening_rate = base_rate * 1.10  # +10%
                night_rate = base_rate * 1.20  # +20%
                day_amount = day_hours * day_rate
                evening_amount = evening_hours * evening_rate
                night_amount = night_hours * night_rate
                shift_total = day_amount + evening_amount + night_amount
                invoice_text += "Datum: {}\n".format(shift["shift_date"])
                locatie_titel = shift.get("titel") if shift.get("titel") else loc
                invoice_text += "Locatie: {}\n".format(locatie_titel)
                invoice_text += "Daguren: {:.2f} uur x €{:.2f} = €{:.2f}\n".format(day_hours, day_rate, day_amount)
                invoice_text += "Avonduren: {:.2f} uur x €{:.2f} = €{:.2f}\n".format(evening_hours, evening_rate,
                                                                                     evening_amount)
                invoice_text += "Nachturen: {:.2f} uur x €{:.2f} = €{:.2f}\n".format(night_hours, night_rate,
                                                                                     night_amount)
                invoice_text += "Totaal voor dienst: €{:.2f}\n\n".format(shift_total)
            total_amount += shift_total

        vat_amount = total_amount * VAT_PERCENTAGE
        total_incl_vat = total_amount + vat_amount

        invoice_text += "Subtotaal: €{:.2f}\n".format(total_amount)
        invoice_text += "BTW (21%): €{:.2f}\n".format(vat_amount)
        invoice_text += "Totaal incl. BTW: €{:.2f}\n".format(total_incl_vat)

        invoice = {
            "id": next_factuur_id,
            "opdrachtgever_id": opdrachtgever_id,
            "locatie": loc,
            "factuurdatum": datetime.now().date(),
            "bedrag": total_incl_vat,
            "status": "open",
            "factuur_text": invoice_text
        }
        next_factuur_id += 1
        fake_facturen_db.append(invoice)
        print("{} - Invoice generated for {}: {}".format(datetime.now(), loc, invoice), flush=True)
    print("{} - Finished generating invoices.".format(datetime.now()), flush=True)


scheduler = BackgroundScheduler()
# Voor testdoeleinden: stel de factuurgeneratie in op interval (bijv. elke 30 seconden)
scheduler.add_job(generate_invoices, 'interval', seconds=30)
# Cron-job: betalingsherinneringen dagelijks om 09:00 uur
scheduler.add_job(send_payment_reminders, 'cron', hour=9, minute=0)
scheduler.start()
print("{} - Scheduler started.".format(datetime.now()), flush=True)

# PDF Export Router (onderdeel van deze module)
pdf_export_router = APIRouter(
    prefix="/pdf-export",
    tags=["pdf-export"]
)


@pdf_export_router.get("/facturen")
async def export_facturen_pdf():
    if not fake_facturen_db:
        raise HTTPException(status_code=404, detail="Geen facturen gevonden om te exporteren")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []
    elements.append(Paragraph("Factuuroverzicht", styles['Title']))
    elements.append(Spacer(1, 12))

    for factuur in fake_facturen_db:
        factuur_text = factuur.get("factuur_text", "").replace("\n", "<br/>")
        text = ("Factuur ID: {}<br/>"
                "Opdrachtgever ID: {}<br/>"
                "Locatie: {}<br/>"
                "Factuurdatum: {}<br/>"
                "Bedrag incl. BTW: €{:.2f}<br/>"
                "Status: {}<br/><br/>"
                "Factuur details:<br/>{}<br/><br/>"
                ).format(
            factuur.get("id"),
            factuur.get("opdrachtgever_id"),
            factuur.get("locatie"),
            factuur.get("factuurdatum"),
            factuur.get("bedrag"),
            factuur.get("status"),
            factuur_text
        )
        elements.append(Paragraph(text, styles['Normal']))
        elements.append(Spacer(1, 12))

    doc.build(elements)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf",
                             headers={"Content-Disposition": "attachment;filename=facturen.pdf"})
