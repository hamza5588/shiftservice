from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime, date, timedelta
from facturatie import  Factuur
from planning import fake_shifts_db
from betalingsherinneringen import send_payment_reminders
from tarieven import fake_tarieven_db
import holidays
import io
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from invoice_payroll import generate_invoice
from database import get_db
from models import Opdrachtgever, Shift
import logging
import sys

# Configure logging to display in console with timestamp
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

# Email Configuration
EMAIL_CONFIG = {
    'host': 'smtp.gmail.com',
    'port': 587,
    'use_tls': True,
    'username': 'y7hamzakhanswati@gmail.com',
    'password': 'sbep muwk dinz xsgx',
    'from_email': 'y7hamzakhanswati@gmail.com'
}

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
    """Generate new invoices from shifts."""
    logger.info(f"{datetime.now()} - Starting invoice generation...")
    
    db = next(get_db())
    try:
        # Get all shifts that haven't been invoiced yet
        shifts = db.query(Shift).filter(Shift.factuur_id == None).all()
        
        # Group shifts by client
        shifts_by_client = {}
        for shift in shifts:
            client_id = shift.opdrachtgever_id
            if client_id not in shifts_by_client:
                shifts_by_client[client_id] = []
            shifts_by_client[client_id].append(shift)
        
        invoices_generated = 0
        
        # Process shifts for each client
        for client_id, client_shifts in shifts_by_client.items():
            try:
                # Get client details from database
                client = db.query(Opdrachtgever).filter(Opdrachtgever.id == client_id).first()
                
                if not client:
                    logger.warning(f"Client not found for ID: {client_id}")
                    continue
                
                if not client.email:
                    logger.warning(f"No email address found for client: {client.naam}")
                    continue
                
                # Calculate invoice details
                total_amount = 0.0
                invoice_text = []
                
                for shift in client_shifts:
                    # Add shift details to invoice text
                    shift_date = shift.datum
                    location = shift.locatie
                    hours = shift.uren
                    rate = shift.tarief
                    amount = hours * rate
                    total_amount += amount
                    
                    invoice_text.append(f"Date: {shift_date}")
                    invoice_text.append(f"Location: {location}")
                    invoice_text.append(f"Hours: {hours} x €{rate:.2f} = €{amount:.2f}\n")
                
                # Create invoice
                invoice = Factuur(
                    opdrachtgever_id=client_id,
                    opdrachtgever_naam=client.naam,
                    email=client.email,
                    kvk_nummer=client.kvk_nummer,
                    adres=client.adres,
                    postcode=client.postcode,
                    stad=client.stad,
                    telefoon=client.telefoon,
                    factuurdatum=datetime.now().date(),
                    bedrag=total_amount,
                    status='open',
                    factuur_text='\n'.join(invoice_text)
                )
                
                db.add(invoice)
                db.flush()  # Get the invoice ID
                
                # Update shifts with invoice ID
                for shift in client_shifts:
                    shift.factuur_id = invoice.id
                
                invoices_generated += 1
                logger.info(f"Generated invoice for {client.naam} ({client.email})")
            
            except Exception as e:
                logger.error(f"Error generating invoice for client {client_id}: {str(e)}")
                continue
        
        db.commit()
        logger.info(f"Generated {invoices_generated} new invoices")
    
    except Exception as e:
        logger.error(f"Error in generate_invoices: {str(e)}")
        db.rollback()
    finally:
        db.close()
    
    logger.info(f"{datetime.now()} - Finished generating invoices.")


def generate_weekly_invoices():
    """Generate invoices for all opdrachtgevers for the previous week."""
    logger.info("Starting weekly invoice generation...")
    
    # Calculate date range (previous week)
    today = date.today()
    last_monday = today - timedelta(days=today.weekday() + 7)
    last_sunday = last_monday + timedelta(days=6)
    
    db = next(get_db())
    try:
        # Get all opdrachtgevers
        opdrachtgevers = db.query(Opdrachtgever).all()
        
        for opdrachtgever in opdrachtgevers:
            try:
                # Generate invoice for the previous week
                invoice = generate_invoice(db, opdrachtgever.id, last_monday, last_sunday)
                if invoice:
                    logger.info(f"Generated invoice {invoice.factuurnummer} for opdrachtgever {opdrachtgever.id}")
                else:
                    logger.warning(f"No invoice generated for opdrachtgever {opdrachtgever.id} - no shifts found")
            except Exception as e:
                logger.error(f"Error generating invoice for opdrachtgever {opdrachtgever.id}: {str(e)}")
                continue
        
        db.commit()
    except Exception as e:
        logger.error(f"Error in weekly invoice generation: {str(e)}")
        db.rollback()
    finally:
        db.close()
    
    logger.info("Weekly invoice generation completed")


def create_invoice_pdf(invoice: Factuur) -> bytes:
    """Create a PDF version of the invoice."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    # Add header
    elements.append(Paragraph("FACTUUR", styles['Title']))
    elements.append(Spacer(1, 20))

    # Add invoice details
    invoice_info = [
        ["Factuurnummer:", invoice.factuurnummer or str(invoice.id)],
        ["Datum:", invoice.factuurdatum.strftime("%d-%m-%Y")],
        ["", ""],
        ["FACTUUR AAN:", ""],
        [invoice.opdrachtgever_naam, ""],
        [f"KVK: {invoice.kvk_nummer}" if invoice.kvk_nummer else "", ""],
        [invoice.adres or "", ""],
        [f"{invoice.postcode}, {invoice.stad}" if invoice.postcode and invoice.stad else "", ""],
        [f"Tel: {invoice.telefoon}" if invoice.telefoon else "", ""],
        [f"Email: {invoice.email}" if invoice.email else "", ""]
    ]

    t = Table(invoice_info, colWidths=[200, 300])
    t.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
    ]))
    elements.append(t)
    elements.append(Spacer(1, 20))

    # Add invoice content
    if invoice.factuur_text:
        for line in invoice.factuur_text.split('\n'):
            elements.append(Paragraph(line, styles['Normal']))
            elements.append(Spacer(1, 6))

    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    return buffer.getvalue()

def send_invoice_email(invoice: Factuur, pdf_content: bytes):
    """Send invoice via email."""
    try:
        msg = MIMEMultipart()
        msg['From'] = EMAIL_CONFIG['from_email']
        msg['To'] = invoice.email
        msg['Subject'] = f"Factuur #{invoice.factuurnummer or invoice.id} van Secufy"

        # Email body
        body = f"""Geachte {invoice.opdrachtgever_naam},

Hierbij ontvangt u de factuur #{invoice.factuurnummer or invoice.id}.

Factuurgegevens:
Bedrag: €{invoice.bedrag:.2f}
Datum: {invoice.factuurdatum}

Voor vragen kunt u contact met ons opnemen.

Met vriendelijke groet,
Secufy Team"""

        msg.attach(MIMEText(body, 'plain'))

        # Attach PDF
        pdf_attachment = MIMEApplication(pdf_content, _subtype='pdf')
        pdf_attachment.add_header('Content-Disposition', 'attachment', 
                                filename=f'factuur_{invoice.factuurnummer or invoice.id}.pdf')
        msg.attach(pdf_attachment)

        # Send email
        with smtplib.SMTP(EMAIL_CONFIG['host'], EMAIL_CONFIG['port']) as server:
            server.starttls()
            server.login(EMAIL_CONFIG['username'], EMAIL_CONFIG['password'])
            server.send_message(msg)

        print(f"\n{'='*50}")
        print(f"✅ Invoice #{invoice.factuurnummer or invoice.id} sent successfully")
        print(f"📧 Sent to: {invoice.email}")
        print(f"�� Amount: €{invoice.bedrag:.2f}")
        print(f"📅 Date: {invoice.factuurdatum}")
        print(f"{'='*50}\n")
        
        logger.info(f"Invoice #{invoice.factuurnummer or invoice.id} sent to {invoice.email}")
        return True
    except Exception as e:
        print(f"\n{'='*50}")
        print(f"❌ Failed to send invoice #{invoice.factuurnummer or invoice.id}")
        print(f"📧 Recipient: {invoice.email}")
        print(f"❌ Error: {str(e)}")
        print(f"{'='*50}\n")
        
        logger.error(f"Failed to send invoice email to {invoice.email}: {str(e)}")
        return False

def process_invoices():
    """Process all open invoices and send them via email."""
    logger.info("Starting invoice processing...")
    
    db = next(get_db())
    try:
        # Get all open invoices
        open_invoices = db.query(Factuur).filter(Factuur.status == 'open').all()
        
        for invoice in open_invoices:
            try:
                # Generate PDF
                pdf_content = create_invoice_pdf(invoice)
                
                # Send email
                if send_invoice_email(invoice, pdf_content):
                    invoice.status = 'sent'
                    logger.info(f"Successfully sent invoice {invoice.id} to {invoice.email}")
                else:
                    logger.error(f"Failed to send invoice {invoice.id} to {invoice.email}")
            
            except Exception as e:
                logger.error(f"Error processing invoice {invoice.id}: {str(e)}")
        
        db.commit()
        logger.info("Invoice processing completed")
    
    except Exception as e:
        logger.error(f"Error in process_invoices: {str(e)}")
        db.rollback()
    finally:
        db.close()

# Initialize scheduler with timezone
scheduler = BackgroundScheduler(timezone='Europe/Amsterdam')

# Add jobs with updated interval (10 seconds)
scheduler.add_job(process_invoices, 'interval', seconds=10)
scheduler.add_job(send_payment_reminders, 'cron', hour=9, minute=0)
scheduler.add_job(
    generate_weekly_invoices,
    'interval',
    seconds=10,  # Changed from weekly to every 10 seconds
    id='weekly_invoice_generation'
)

# Start scheduler
scheduler.start()
print(f"\n{'='*50}")
print("🚀 Scheduler started")
print("📧 Invoice processing will run every 10 seconds")
print("📊 Weekly invoice generation will run every 10 seconds")
print(f"{'='*50}\n")
logger.info("Scheduler started - Invoice processing and weekly generation set to 10-second intervals")

# PDF Export Router
pdf_export_router = APIRouter(
    prefix="/pdf-export",
    tags=["pdf-export"]
)

@pdf_export_router.get("/facturen")
async def export_facturen_pdf():
    """Export all invoices as PDF."""
    db = next(get_db())
    try:
        facturen = db.query(Factuur).all()
        if not facturen:
            raise HTTPException(status_code=404, detail="No invoices found to export")

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        elements = []

        elements.append(Paragraph("Factuuroverzicht", styles['Title']))
        elements.append(Spacer(1, 12))

        for factuur in facturen:
            elements.append(Paragraph(f"Factuur #{factuur.id}", styles['Heading2']))
            elements.append(Spacer(1, 6))
            
            if factuur.factuur_text:
                for line in factuur.factuur_text.split('\n'):
                    elements.append(Paragraph(line, styles['Normal']))
            elements.append(Spacer(1, 12))

        doc.build(elements)
        buffer.seek(0)
        
        return StreamingResponse(
            buffer, 
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment;filename=facturen.pdf"}
        )
    
    except Exception as e:
        logger.error(f"Error exporting invoices: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()
