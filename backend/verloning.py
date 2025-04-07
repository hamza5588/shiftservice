import csv
import io
import os
from fastapi import APIRouter, HTTPException, Query, Depends, UploadFile, File
from fastapi.responses import StreamingResponse, FileResponse
from datetime import date, datetime, timedelta, time
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from sqlalchemy.orm import Session

from utils import calculate_hours, get_bonus_percentage
from planning import fake_shifts_db
from employee_profiles_data import employee_profiles
from auth import get_current_user, require_roles
from database import get_db
from models import Verloning, User

router = APIRouter(
    prefix="/verloning",
    tags=["verloning"]
)

TRAVEL_RATE = 0.23
MAX_DISTANCE = 60
BASE_WAGE = 20.0  # fallback als geen hourly_allowance is ingesteld


class PayrollEntry(BaseModel):
    employee_id: str
    personeelsnummer: int
    naam: str
    uurloner: bool
    total_days: int
    total_hours: float
    total_travel_cost: float
    total_telefoon: float
    total_maaltijd: float
    total_de_minimis: float
    total_wkr: float
    total_km_vergoeding: float
    bonus_percentage: float  # Gemiddeld over alle shifts
    base_pay: float
    total_pay: float
    shifts: List[Dict[str, Any]]
    opmerkingen: Optional[str] = ""
    periode: Optional[int] = None
    periode_start: Optional[str] = None
    periode_end: Optional[str] = None


def get_period_dates(year: int, periode: int) -> (date, date):
    """
    Bepaal de start- en einddatum van een 4-wekenperiode (1 t/m 13) voor het opgegeven jaar.
    Periode 1 t/m 12: 28 dagen per periode, periode 13: rest van het jaar.
    """
    if periode < 1 or periode > 13:
        raise ValueError("Periode moet tussen 1 en 13 liggen.")
    if periode <= 12:
        start = date(year, 1, 1) + timedelta(days=(periode - 1) * 28)
        end = start + timedelta(days=27)
    else:
        start = date(year, 1, 1) + timedelta(days=12 * 28)
        end = date(year, 12, 31)
    return start, end


@router.get("/", response_model=List[PayrollEntry])
async def get_payroll(
        year: Optional[int] = Query(None, description="Het jaar waarvoor de loonstrook wordt gegenereerd")
):
    """
    Genereer de loonstrook (mutatieblad) per medewerker voor het gehele jaar,
    waarbij de shifts automatisch worden opgedeeld in 13 vierwekenperiodes.

    Voor iedere shift binnen een periode:
      - Bereken gewerkte uren via calculate_hours
      - Bonuspercentage via get_bonus_percentage
      - Reiskosten: 2 * min(reiskilometers, MAX_DISTANCE) * TRAVEL_RATE
    De vaste verloningsgegevens (telefoonvergoeding, maaltijdvergoeding, de-minimis, WKR-toeslag)
    komen uit employee_profiles.
    """
    if year is None:
        year = date.today().year

    payroll_entries = []
    # Doorloop alle 13 periodes
    for periode in range(1, 14):
        try:
            start_date, end_date = get_period_dates(year, periode)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # period_payroll: per medewerker in deze periode
        period_payroll: Dict[str, PayrollEntry] = {}

        # Loop door alle shifts in fake_shifts_db
        for shift in fake_shifts_db:
            shift_date = shift["shift_date"]
            if isinstance(shift_date, str):
                shift_date = date.fromisoformat(shift_date)
            if not (start_date <= shift_date <= end_date):
                continue

            hours = calculate_hours(shift)
            bonus = get_bonus_percentage(shift)
            travel_cost = 0.0
            if shift.get("reiskilometers") is not None:
                distance = min(shift["reiskilometers"], MAX_DISTANCE)
                travel_cost = 2 * distance * TRAVEL_RATE

            for employee in shift.get("employee_ids", []):
                profile = employee_profiles.get(employee)
                if profile is None:
                    continue

                if employee not in period_payroll:
                    period_payroll[employee] = PayrollEntry(
                        employee_id=employee,
                        personeelsnummer=profile.get("personeelsnummer", 0),
                        naam=profile.get("naam", employee),
                        uurloner=profile.get("uurloner", False),
                        total_days=0,
                        total_hours=0.0,
                        total_travel_cost=0.0,
                        total_telefoon=0.0,
                        total_maaltijd=0.0,
                        total_de_minimis=0.0,
                        total_wkr=0.0,
                        total_km_vergoeding=0.0,
                        bonus_percentage=0.0,
                        base_pay=0.0,
                        total_pay=0.0,
                        shifts=[],
                        opmerkingen="",
                        periode=periode,
                        periode_start=start_date.isoformat(),
                        periode_end=end_date.isoformat()
                    )
                entry = period_payroll[employee]
                entry.total_days += 1
                entry.total_hours += hours
                entry.total_travel_cost += travel_cost
                entry.total_telefoon += profile.get("telefoonvergoeding_per_uur", 0) * hours
                entry.total_maaltijd += profile.get("maaltijdvergoeding_per_uur", 0) * hours
                entry.total_de_minimis += profile.get("de_minimis_bonus_per_uur", 0) * hours
                entry.total_wkr += profile.get("wkr_toeslag_per_uur", 0) * hours
                entry.total_km_vergoeding += travel_cost
                entry.shifts.append({
                    "shift_id": shift["id"],
                    "date": shift_date.isoformat(),
                    "hours": hours,
                    "bonus": bonus,
                    "travel_cost": travel_cost
                })

        # Voeg medewerkers toe die geen shifts hebben in deze periode (0-uren)
        for emp_id, profile in employee_profiles.items():
            if emp_id not in period_payroll:
                period_payroll[emp_id] = PayrollEntry(
                    employee_id=emp_id,
                    personeelsnummer=profile.get("personeelsnummer", 0),
                    naam=profile.get("naam", emp_id),
                    uurloner=profile.get("uurloner", False),
                    total_days=0,
                    total_hours=0.0,
                    total_travel_cost=0.0,
                    total_telefoon=0.0,
                    total_maaltijd=0.0,
                    total_de_minimis=0.0,
                    total_wkr=0.0,
                    total_km_vergoeding=0.0,
                    bonus_percentage=0.0,
                    base_pay=0.0,
                    total_pay=0.0,
                    shifts=[],
                    opmerkingen="",
                    periode=periode,
                    periode_start=start_date.isoformat(),
                    periode_end=end_date.isoformat()
                )

        for entry in period_payroll.values():
            if entry.total_hours > 0:
                profile = employee_profiles.get(entry.employee_id, {})
                hourly_allowance = profile.get("hourly_allowance", BASE_WAGE)
                entry.base_pay = entry.total_hours * hourly_allowance
                total_bonus = sum(s["bonus"] for s in entry.shifts)
                avg_bonus = total_bonus / len(entry.shifts) if entry.shifts else 0.0
                entry.bonus_percentage = avg_bonus
                entry.total_pay = entry.base_pay * (1 + avg_bonus) + entry.total_travel_cost
            payroll_entries.append(entry.dict())

    if not payroll_entries:
        raise HTTPException(status_code=404, detail="Geen verloningsgegevens gevonden")
    return payroll_entries


@router.get("/export", response_class=StreamingResponse)
async def export_payroll_csv(
        year: Optional[int] = Query(None, description="Het jaar waarvoor de loonstrook wordt gegenereerd")
):
    """
    Exporteer het mutatieblad met de volgende kolomkoppen:
    Personeelsnummer, Naam, Uurloner, gewerkte dagen (uurloners), gewerkte uren (uurloners),
    Meeruren (parttimers), Wachtdag in uren bij ziekte (1e jaar in dienst), Uitbetalen ziekte 70% in uren (1e jaar in dienst),
    Uitbetalen ziekte 100% (1e halfjaar na 1 jaar in dienst), Uitbetalen ziekte 90% (2e halfjaar na 1 jaar in dienst),
    Uitbetelen ziekte 85% (2e ziektejaar na 1 jaar in dienst), Avonduren toeslag 10%, Nachttoeslag uren 20%,
    Weekendtoeslag uren 35%, Feestdagentoeslag uren 50%, Oudjaarstoeslag uren 100% (vanaf 16.00 uur),
    Gemiddelde ORT-toeslag in bedrag per uur tijdens ziekte of vakantie, Gemiddelde ORT-toeslag in uren per uur tijdens ziekte of vakantie,
    Telefoonvergoeding (onbelast), Maaltijdvergoeding (onbelast), Deminimiis Bonus (bruto), WKR -toeslag (onbelast),
    Kilometervergoeding à € 0,23, opmerkingen en mutaties vaste gegevens.
    Medewerkers zonder uren worden getoond (0-uren).
    """
    payroll_entries = await get_payroll(year=year)

    headers = [
        "Personeelsnummer",
        "Naam",
        "Uurloner",
        "gewerkte dagen (uurloners)",
        "gewerkte uren (uurloners)",
        "Meeruren (parttimers)",
        "Wachtdag in uren bij ziekte (1e jaar in dienst)",
        "Uitbetalen ziekte 70% in uren (1e jaar in dienst)",
        "Uitbetalen ziekte 100% (1e halfjaar na 1 jaar in dienst)",
        "Uitbetalen ziekte 90% (2e halfjaar na 1 jaar in dienst)",
        "Uitbetelen ziekte 85% (2e ziektejaar na 1 jaar in dienst)",
        "Avonduren toeslag 10%",
        "Nachttoeslag uren 20%",
        "Weekendtoeslag uren 35%",
        "Feestdagentoeslag uren 50%",
        "Oudjaarstoeslag uren 100% (vanaf 16.00 uur)",
        "Gemiddelde ORT-toeslag in bedrag per uur tijdens ziekte of vakantie",
        "Gemiddelde ORT-toeslag in uren per uur tijdens ziekte of vakantie",
        "Telefoonvergoeding (onbelast)",
        "Maaltijdvergoeding (onbelast)",
        "Deminimiis Bonus (bruto)",
        "WKR -toeslag (onbelast)",
        " Kilometervergoeding à € 0,23 ",
        "opmerkingen en mutaties vaste gegevens"
    ]

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()

    for entry in payroll_entries:
        row = {
            "Personeelsnummer": entry.get("personeelsnummer", ""),
            "Naam": entry.get("naam", ""),
            "Uurloner": "Ja" if entry.get("uurloner", False) else "Nee",
            "gewerkte dagen (uurloners)": entry.get("total_days", 0),
            "gewerkte uren (uurloners)": f"{entry.get('total_hours', 0):.2f}",
            "Meeruren (parttimers)": "",
            "Wachtdag in uren bij ziekte (1e jaar in dienst)": "",
            "Uitbetalen ziekte 70% in uren (1e jaar in dienst)": "",
            "Uitbetalen ziekte 100% (1e halfjaar na 1 jaar in dienst)": "",
            "Uitbetalen ziekte 90% (2e halfjaar na 1 jaar in dienst)": "",
            "Uitbetelen ziekte 85% (2e ziektejaar na 1 jaar in dienst)": "",
            "Avonduren toeslag 10%": "",
            "Nachttoeslag uren 20%": "",
            "Weekendtoeslag uren 35%": "",
            "Feestdagentoeslag uren 50%": "",
            "Oudjaarstoeslag uren 100% (vanaf 16.00 uur)": "",
            "Gemiddelde ORT-toeslag in bedrag per uur tijdens ziekte of vakantie": "",
            "Gemiddelde ORT-toeslag in uren per uur tijdens ziekte of vakantie": "",
            "Telefoonvergoeding (onbelast)": f"{entry.get('total_telefoon', 0):.2f}",
            "Maaltijdvergoeding (onbelast)": f"{entry.get('total_maaltijd', 0):.2f}",
            "Deminimiis Bonus (bruto)": f"{entry.get('total_de_minimis', 0):.2f}",
            "WKR -toeslag (onbelast)": f"{entry.get('total_wkr', 0):.2f}",
            " Kilometervergoeding à € 0,23 ": f"{entry.get('total_km_vergoeding', 0):.2f}",
            "opmerkingen en mutaties vaste gegevens": entry.get("opmerkingen", "")
        }
        writer.writerow(row)

    output.seek(0)
    filename = f"Mutatieblad_{year}.csv"
    headers_resp = {"Content-Disposition": f"attachment; filename={filename}"}
    return StreamingResponse(output, media_type="text/csv", headers=headers_resp)


# Nieuwe endpoints voor loonstrook uploaden en downloaden

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads", "loonstroken")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/upload", status_code=201)
async def upload_loonstrook(employee_id: str, file: UploadFile = File(...),
                            current_user: dict = Depends(require_roles(["admin", "boekhouding"]))):
    """
    Admins & Boekhouding kunnen loonstroken uploaden.
    Het formulier moet het employee_id en het bestand bevatten.
    Het bestand wordt opgeslagen in de map uploads/loonstroken met een naam als: {employee_id}_{original_filename}
    """
    filename = f"{employee_id}_{file.filename}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        buffer.write(await file.read())

    return {"filename": filename, "detail": "Loonstrook succesvol geüpload."}


@router.get("/uploads", response_model=List[str])
async def list_loonstroken(current_user: dict = Depends(require_roles(["admin", "boekhouding"]))):
    """
    Haal de lijst op met alle geüploade loonstroken.
    Retourneert een lijst van bestandsnamen.
    """
    try:
        files = os.listdir(UPLOAD_DIR)
        return files
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/download/{employee_id}")
async def download_loonstroken(employee_id: str, current_user: dict = Depends(get_current_user)):
    """
    Medewerkers kunnen hun eigen loonstroken downloaden.
    Zoekt naar bestanden in de uploadmap die beginnen met {employee_id}_.
    Als er precies één bestand is, wordt dit direct teruggegeven.
    Als er meerdere zijn, wordt een lijst met bestandsnamen geretourneerd.
    Alleen de medewerker zelf of een admin/boekhouding mag deze endpoint benaderen.
    """
    if current_user["role"] not in ["medewerker", "planner", "admin", "boekhouding"]:
        raise HTTPException(status_code=403, detail="Onvoldoende rechten.")
    if current_user["role"] == "medewerker" and current_user["username"] != employee_id:
        raise HTTPException(status_code=403, detail="Je kunt alleen je eigen loonstroken downloaden.")

    files = [f for f in os.listdir(UPLOAD_DIR) if f.startswith(f"{employee_id}_")]

    if not files:
        raise HTTPException(status_code=404, detail="Geen loonstroken gevonden voor deze medewerker.")
    elif len(files) == 1:
        file_path = os.path.join(UPLOAD_DIR, files[0])
        return FileResponse(path=file_path, filename=files[0])
    else:
        return {"files": files,
                "detail": "Meerdere loonstroken gevonden. Gebruik /download/{employee_id}/{filename} om een specifiek bestand te downloaden."}


@router.get("/download/{employee_id}/{filename}")
async def download_specific_loonstrook(employee_id: str, filename: str, current_user: dict = Depends(get_current_user)):
    """
    Download een specifiek loonstrookbestand voor een medewerker.
    """
    if current_user["role"] == "medewerker" and current_user["username"] != employee_id:
        raise HTTPException(status_code=403, detail="Je kunt alleen je eigen loonstroken downloaden.")
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Bestand niet gevonden.")
    return FileResponse(path=file_path, filename=filename)


class VerloningBase(BaseModel):
    employee_id: str
    datum: date
    bedrag: float
    status: str = "nieuw"


class VerloningCreate(VerloningBase):
    pass


class VerloningResponse(BaseModel):
    id: int
    medewerker_id: int
    datum: date
    bedrag: float
    status: str

    class Config:
        orm_mode = True


@router.get("/", response_model=List[VerloningResponse])
async def get_verloningen(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Haal alle verloningen op."""
    if current_user.role in ["admin", "boekhouding"]:
        verloningen = db.query(Verloning).all()
    else:
        # For non-admin users, we need to find their medewerker_id first
        user = db.query(User).filter(User.username == current_user.username).first()
        if not user:
            raise HTTPException(status_code=404, detail="Gebruiker niet gevonden")
        verloningen = db.query(Verloning).filter(Verloning.medewerker_id == user.id).all()
    
    return verloningen


@router.post("/", response_model=VerloningResponse, status_code=201)
async def create_verloning(
    verloning: VerloningCreate,
    current_user: dict = Depends(require_roles(["admin", "boekhouding"])),
    db: Session = Depends(get_db)
):
    """Maak een nieuwe verloning aan."""
    # Check if employee exists
    employee = db.query(User).filter(User.username == verloning.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Medewerker niet gevonden")

    # Create a dict with the correct field names
    verloning_dict = verloning.dict()
    verloning_dict['medewerker_id'] = employee.id  # Map employee_id to medewerker_id
    del verloning_dict['employee_id']  # Remove the employee_id field

    db_verloning = Verloning(**verloning_dict)
    db.add(db_verloning)
    db.commit()
    db.refresh(db_verloning)
    return db_verloning


@router.get("/{verloning_id}", response_model=VerloningResponse)
async def get_verloning(
    verloning_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Haal een specifieke verloning op."""
    verloning = db.query(Verloning).filter(Verloning.id == verloning_id).first()
    if not verloning:
        raise HTTPException(status_code=404, detail="Verloning niet gevonden")

    # Check if user has permission to view this verloning
    if current_user.role not in ["admin", "boekhouding"]:
        # For non-admin users, we need to find their medewerker_id first
        user = db.query(User).filter(User.username == current_user.username).first()
        if not user or verloning.medewerker_id != user.id:
            raise HTTPException(status_code=403, detail="Niet bevoegd om deze verloning te bekijken")

    return verloning


@router.put("/{verloning_id}", response_model=VerloningResponse)
async def update_verloning(
    verloning_id: int,
    verloning_update: VerloningBase,
    current_user: dict = Depends(require_roles(["admin", "boekhouding"])),
    db: Session = Depends(get_db)
):
    """Update een bestaande verloning."""
    db_verloning = db.query(Verloning).filter(Verloning.id == verloning_id).first()
    if not db_verloning:
        raise HTTPException(status_code=404, detail="Verloning niet gevonden")

    # Check if employee exists
    employee = db.query(User).filter(User.username == verloning_update.employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Medewerker niet gevonden")

    # Update fields
    db_verloning.medewerker_id = employee.id
    db_verloning.datum = verloning_update.datum
    db_verloning.bedrag = verloning_update.bedrag
    db_verloning.status = verloning_update.status

    db.commit()
    db.refresh(db_verloning)
    return db_verloning


@router.delete("/{verloning_id}")
async def delete_verloning(
    verloning_id: int,
    current_user: dict = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """Verwijder een verloning."""
    db_verloning = db.query(Verloning).filter(Verloning.id == verloning_id).first()
    if not db_verloning:
        raise HTTPException(status_code=404, detail="Verloning niet gevonden")

    db.delete(db_verloning)
    db.commit()
    return {"message": "Verloning verwijderd"}


@router.get("/my-payroll", response_model=List[PayrollEntry])
async def get_my_payroll(
    year: Optional[int] = Query(None, description="Het jaar waarvoor de loonstrook wordt gegenereerd"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get payroll information for the current employee.
    Only employees can access this endpoint.
    """
    if "employee" not in current_user["roles"]:
        raise HTTPException(status_code=403, detail="Only employees can view their own payroll")
    
    all_payroll = await get_payroll(year=year)
    return [entry for entry in all_payroll if entry["employee_id"] == current_user["username"]]


@router.get("/my-payroll/export", response_class=StreamingResponse)
async def export_my_payroll_csv(
    year: Optional[int] = Query(None, description="Het jaar waarvoor de loonstrook wordt gegenereerd"),
    current_user: dict = Depends(get_current_user)
):
    """
    Export payroll information for the current employee.
    Only employees can access this endpoint.
    """
    if "employee" not in current_user["roles"]:
        raise HTTPException(status_code=403, detail="Only employees can export their own payroll")
    
    all_payroll = await get_payroll(year=year)
    my_payroll = [entry for entry in all_payroll if entry["employee_id"] == current_user["username"]]
    
    if not my_payroll:
        raise HTTPException(status_code=404, detail="No payroll data found for you")

    headers = [
        "Personeelsnummer",
        "Naam",
        "Uurloner",
        "gewerkte dagen (uurloners)",
        "gewerkte uren (uurloners)",
        "Meeruren (parttimers)",
        "Wachtdag in uren bij ziekte (1e jaar in dienst)",
        "Uitbetalen ziekte 70% in uren (1e jaar in dienst)",
        "Uitbetalen ziekte 100% (1e halfjaar na 1 jaar in dienst)",
        "Uitbetalen ziekte 90% (2e halfjaar na 1 jaar in dienst)",
        "Uitbetelen ziekte 85% (2e ziektejaar na 1 jaar in dienst)",
        "Avonduren toeslag 10%",
        "Nachttoeslag uren 20%",
        "Weekendtoeslag uren 35%",
        "Feestdagentoeslag uren 50%",
        "Oudjaarstoeslag uren 100% (vanaf 16.00 uur)",
        "Gemiddelde ORT-toeslag in bedrag per uur tijdens ziekte of vakantie",
        "Gemiddelde ORT-toeslag in uren per uur tijdens ziekte of vakantie",
        "Telefoonvergoeding (onbelast)",
        "Maaltijdvergoeding (onbelast)",
        "Deminimiis Bonus (bruto)",
        "WKR -toeslag (onbelast)",
        " Kilometervergoeding à € 0,23 ",
        "opmerkingen en mutaties vaste gegevens"
    ]

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=headers)
    writer.writeheader()

    for entry in my_payroll:
        row = {
            "Personeelsnummer": entry.get("personeelsnummer", ""),
            "Naam": entry.get("naam", ""),
            "Uurloner": "Ja" if entry.get("uurloner", False) else "Nee",
            "gewerkte dagen (uurloners)": entry.get("total_days", 0),
            "gewerkte uren (uurloners)": entry.get("total_hours", 0.0),
            "Meeruren (parttimers)": 0.0,  # This would need to be calculated based on contract hours
            "Wachtdag in uren bij ziekte (1e jaar in dienst)": 0.0,
            "Uitbetalen ziekte 70% in uren (1e jaar in dienst)": 0.0,
            "Uitbetalen ziekte 100% (1e halfjaar na 1 jaar in dienst)": 0.0,
            "Uitbetalen ziekte 90% (2e halfjaar na 1 jaar in dienst)": 0.0,
            "Uitbetelen ziekte 85% (2e ziektejaar na 1 jaar in dienst)": 0.0,
            "Avonduren toeslag 10%": 0.0,
            "Nachttoeslag uren 20%": 0.0,
            "Weekendtoeslag uren 35%": 0.0,
            "Feestdagentoeslag uren 50%": 0.0,
            "Oudjaarstoeslag uren 100% (vanaf 16.00 uur)": 0.0,
            "Gemiddelde ORT-toeslag in bedrag per uur tijdens ziekte of vakantie": 0.0,
            "Gemiddelde ORT-toeslag in uren per uur tijdens ziekte of vakantie": 0.0,
            "Telefoonvergoeding (onbelast)": entry.get("total_telefoon", 0.0),
            "Maaltijdvergoeding (onbelast)": entry.get("total_maaltijd", 0.0),
            "Deminimiis Bonus (bruto)": entry.get("total_de_minimis", 0.0),
            "WKR -toeslag (onbelast)": entry.get("total_wkr", 0.0),
            " Kilometervergoeding à € 0,23 ": entry.get("total_km_vergoeding", 0.0),
            "opmerkingen en mutaties vaste gegevens": entry.get("opmerkingen", "")
        }
        writer.writerow(row)

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=payroll_{current_user['username']}_{year or date.today().year}.csv"
        }
    )
