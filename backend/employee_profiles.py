from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import date, datetime, timedelta, time
from planning import fake_shifts_db
from utils import calculate_hours, get_bonus_percentage
from database import get_db
from sqlalchemy.orm import Session
from models import Medewerker
from auth import get_current_user

# Create a router for employee profiles
employee_profiles_router = APIRouter(
    prefix="/employee_profiles",
    tags=["employee_profiles"]
)

# Create a router for payroll
payroll_router = APIRouter(
    prefix="/verloning",
    tags=["verloning"]
)

# Instellingen voor reiskosten
TRAVEL_RATE = 0.23
MAX_DISTANCE = 60
BASE_WAGE = 20.0  # fallback als geen hourly_allowance is ingesteld

# Employee Profile model
class EmployeeProfile(BaseModel):
    employee_id: str
    personeelsnummer: Optional[int] = None
    naam: Optional[str] = None
    voornaam: Optional[str] = None
    tussenvoegsel: Optional[str] = None
    achternaam: Optional[str] = None
    initialen: Optional[str] = None
    email: Optional[str] = None
    telefoon: Optional[str] = None
    adres: Optional[str] = None
    huisnummer: Optional[str] = None
    huisnummer_toevoeging: Optional[str] = None
    postcode: Optional[str] = None
    stad: Optional[str] = None
    geboortedatum: Optional[date] = None
    geboorteplaats: Optional[str] = None
    geslacht: Optional[str] = None
    burgerlijke_staat: Optional[str] = None
    bsn: Optional[str] = None
    nationaliteit: Optional[str] = None
    in_dienst: Optional[date] = None
    uit_dienst: Optional[date] = None
    pas_type: Optional[str] = None
    pas_nummer: Optional[str] = None
    pas_vervaldatum: Optional[date] = None
    pas_foto: Optional[str] = None
    pas_foto_voorzijde: Optional[str] = None
    pas_foto_achterzijde: Optional[str] = None
    contract_type: Optional[str] = None
    contract_uren: Optional[int] = None
    contract_vervaldatum: Optional[date] = None
    uurloner: Optional[bool] = True
    telefoonvergoeding_per_uur: Optional[float] = 2.0
    maaltijdvergoeding_per_uur: Optional[float] = 1.5
    de_minimis_bonus_per_uur: Optional[float] = 0.5
    wkr_toeslag_per_uur: Optional[float] = 1.0
    kilometervergoeding: Optional[float] = 0.23
    max_km: Optional[int] = 60
    hourly_allowance: Optional[float] = BASE_WAGE

    class Config:
        from_attributes = True

# PayrollEntry model met extra velden voor periode-informatie
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

# Employee profiles endpoint
@employee_profiles_router.get("/", response_model=List[EmployeeProfile])
async def get_employee_profiles(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all employee profiles."""
    try:
        # Get all employees from the database
        employees = db.query(Medewerker).all()
        
        # Convert to EmployeeProfile format
        profiles = []
        for employee in employees:
            profile = EmployeeProfile(
                employee_id=str(employee.id),
                personeelsnummer=employee.id,
                naam=employee.naam,
                voornaam=employee.voornaam,
                tussenvoegsel=employee.tussenvoegsel,
                achternaam=employee.achternaam,
                initialen=employee.initialen,
                email=employee.email,
                telefoon=employee.telefoon,
                adres=employee.adres,
                huisnummer=employee.huisnummer,
                huisnummer_toevoeging=employee.huisnummer_toevoeging,
                postcode=employee.postcode,
                stad=employee.stad,
                geboortedatum=employee.geboortedatum,
                geboorteplaats=employee.geboorteplaats,
                geslacht=employee.geslacht,
                burgerlijke_staat=employee.burgerlijke_staat,
                bsn=employee.bsn,
                nationaliteit=employee.nationaliteit,
                in_dienst=employee.in_dienst,
                uit_dienst=employee.uit_dienst,
                pas_type=employee.pas_type,
                pas_nummer=employee.pas_nummer,
                pas_vervaldatum=employee.pas_vervaldatum,
                pas_foto=employee.pas_foto,
                pas_foto_voorzijde=employee.pas_foto_voorzijde,
                pas_foto_achterzijde=employee.pas_foto_achterzijde,
                contract_type=employee.contract_type,
                contract_uren=employee.contract_uren,
                contract_vervaldatum=employee.contract_vervaldatum,
                uurloner=True,  # Default value, can be updated based on contract_type
                telefoonvergoeding_per_uur=2.0,  # Default values, can be moved to database
                maaltijdvergoeding_per_uur=1.5,
                de_minimis_bonus_per_uur=0.5,
                wkr_toeslag_per_uur=1.0,
                kilometervergoeding=0.23,
                max_km=60,
                hourly_allowance=BASE_WAGE
            )
            profiles.append(profile)
        
        return profiles
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@employee_profiles_router.get("/{employee_id}", response_model=EmployeeProfile)
async def get_employee_profile(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific employee profile by ID."""
    try:
        if not employee_id or employee_id == "undefined":
            raise HTTPException(status_code=400, detail="Employee ID is required")
            
        try:
            employee_id_int = int(employee_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid employee ID format")
            
        employee = db.query(Medewerker).filter(Medewerker.id == employee_id_int).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee profile not found")
        
        return EmployeeProfile(
            employee_id=str(employee.id),
            personeelsnummer=employee.id,
            naam=employee.naam,
            voornaam=employee.voornaam,
            tussenvoegsel=employee.tussenvoegsel,
            achternaam=employee.achternaam,
            initialen=employee.initialen,
            email=employee.email,
            telefoon=employee.telefoon,
            adres=employee.adres,
            huisnummer=employee.huisnummer,
            huisnummer_toevoeging=employee.huisnummer_toevoeging,
            postcode=employee.postcode,
            stad=employee.stad,
            geboortedatum=employee.geboortedatum,
            geboorteplaats=employee.geboorteplaats,
            geslacht=employee.geslacht,
            burgerlijke_staat=employee.burgerlijke_staat,
            bsn=employee.bsn,
            nationaliteit=employee.nationaliteit,
            in_dienst=employee.in_dienst,
            uit_dienst=employee.uit_dienst,
            pas_type=employee.pas_type,
            pas_nummer=employee.pas_nummer,
            pas_vervaldatum=employee.pas_vervaldatum,
            pas_foto=employee.pas_foto,
            pas_foto_voorzijde=employee.pas_foto_voorzijde,
            pas_foto_achterzijde=employee.pas_foto_achterzijde,
            contract_type=employee.contract_type,
            contract_uren=employee.contract_uren,
            contract_vervaldatum=employee.contract_vervaldatum,
            uurloner=True,  # Default value, can be updated based on contract_type
            telefoonvergoeding_per_uur=2.0,  # Default values, can be moved to database
            maaltijdvergoeding_per_uur=1.5,
            de_minimis_bonus_per_uur=0.5,
            wkr_toeslag_per_uur=1.0,
            kilometervergoeding=0.23,
            max_km=60,
            hourly_allowance=BASE_WAGE
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@employee_profiles_router.get("/my-profile", response_model=EmployeeProfile)
async def get_my_profile(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get the current user's employee profile."""
    if "employee" not in current_user["roles"]:
        raise HTTPException(status_code=403, detail="Only employees can view their own profile")
    
    try:
        employee = db.query(Medewerker).filter(Medewerker.user_id == current_user["id"]).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee profile not found")
        
        return EmployeeProfile(
            employee_id=str(employee.id),
            personeelsnummer=employee.id,
            naam=employee.naam,
            voornaam=employee.voornaam,
            tussenvoegsel=employee.tussenvoegsel,
            achternaam=employee.achternaam,
            initialen=employee.initialen,
            email=employee.email,
            telefoon=employee.telefoon,
            adres=employee.adres,
            huisnummer=employee.huisnummer,
            huisnummer_toevoeging=employee.huisnummer_toevoeging,
            postcode=employee.postcode,
            stad=employee.stad,
            geboortedatum=employee.geboortedatum,
            geboorteplaats=employee.geboorteplaats,
            geslacht=employee.geslacht,
            burgerlijke_staat=employee.burgerlijke_staat,
            bsn=employee.bsn,
            nationaliteit=employee.nationaliteit,
            in_dienst=employee.in_dienst,
            uit_dienst=employee.uit_dienst,
            pas_type=employee.pas_type,
            pas_nummer=employee.pas_nummer,
            pas_vervaldatum=employee.pas_vervaldatum,
            pas_foto=employee.pas_foto,
            pas_foto_voorzijde=employee.pas_foto_voorzijde,
            pas_foto_achterzijde=employee.pas_foto_achterzijde,
            contract_type=employee.contract_type,
            contract_uren=employee.contract_uren,
            contract_vervaldatum=employee.contract_vervaldatum,
            uurloner=True,  # Default value, can be updated based on contract_type
            telefoonvergoeding_per_uur=2.0,  # Default values, can be moved to database
            maaltijdvergoeding_per_uur=1.5,
            de_minimis_bonus_per_uur=0.5,
            wkr_toeslag_per_uur=1.0,
            kilometervergoeding=0.23,
            max_km=60,
            hourly_allowance=BASE_WAGE
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@employee_profiles_router.put("/{employee_id}", response_model=EmployeeProfile)
async def update_employee_profile(
    employee_id: str,
    employee_data: EmployeeProfile,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update a specific employee profile by ID."""
    try:
        if not employee_id or employee_id == "undefined":
            raise HTTPException(status_code=400, detail="Employee ID is required")
            
        try:
            employee_id_int = int(employee_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid employee ID format")
            
        employee = db.query(Medewerker).filter(Medewerker.id == employee_id_int).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee profile not found")
        
        # Update employee fields
        employee.naam = employee_data.naam
        employee.voornaam = employee_data.voornaam
        employee.tussenvoegsel = employee_data.tussenvoegsel
        employee.achternaam = employee_data.achternaam
        employee.initialen = employee_data.initialen
        employee.email = employee_data.email
        employee.telefoon = employee_data.telefoon
        employee.adres = employee_data.adres
        employee.huisnummer = employee_data.huisnummer
        employee.huisnummer_toevoeging = employee_data.huisnummer_toevoeging
        employee.postcode = employee_data.postcode
        employee.stad = employee_data.stad
        employee.geboortedatum = employee_data.geboortedatum
        employee.geboorteplaats = employee_data.geboorteplaats
        employee.geslacht = employee_data.geslacht
        employee.burgerlijke_staat = employee_data.burgerlijke_staat
        employee.bsn = employee_data.bsn
        employee.nationaliteit = employee_data.nationaliteit
        employee.in_dienst = employee_data.in_dienst
        employee.uit_dienst = employee_data.uit_dienst
        employee.pas_type = employee_data.pas_type
        employee.pas_nummer = employee_data.pas_nummer
        employee.pas_vervaldatum = employee_data.pas_vervaldatum
        employee.contract_type = employee_data.contract_type
        employee.contract_uren = employee_data.contract_uren
        employee.contract_vervaldatum = employee_data.contract_vervaldatum
        
        db.commit()
        db.refresh(employee)
        
        return EmployeeProfile(
            employee_id=str(employee.id),
            personeelsnummer=employee.id,
            naam=employee.naam,
            voornaam=employee.voornaam,
            tussenvoegsel=employee.tussenvoegsel,
            achternaam=employee.achternaam,
            initialen=employee.initialen,
            email=employee.email,
            telefoon=employee.telefoon,
            adres=employee.adres,
            huisnummer=employee.huisnummer,
            huisnummer_toevoeging=employee.huisnummer_toevoeging,
            postcode=employee.postcode,
            stad=employee.stad,
            geboortedatum=employee.geboortedatum,
            geboorteplaats=employee.geboorteplaats,
            geslacht=employee.geslacht,
            burgerlijke_staat=employee.burgerlijke_staat,
            bsn=employee.bsn,
            nationaliteit=employee.nationaliteit,
            in_dienst=employee.in_dienst,
            uit_dienst=employee.uit_dienst,
            pas_type=employee.pas_type,
            pas_nummer=employee.pas_nummer,
            pas_vervaldatum=employee.pas_vervaldatum,
            pas_foto=employee.pas_foto,
            pas_foto_voorzijde=employee.pas_foto_voorzijde,
            pas_foto_achterzijde=employee.pas_foto_achterzijde,
            contract_type=employee.contract_type,
            contract_uren=employee.contract_uren,
            contract_vervaldatum=employee.contract_vervaldatum,
            uurloner=True,
            telefoonvergoeding_per_uur=2.0,
            maaltijdvergoeding_per_uur=1.5,
            de_minimis_bonus_per_uur=0.5,
            wkr_toeslag_per_uur=1.0,
            kilometervergoeding=0.23,
            max_km=60,
            hourly_allowance=BASE_WAGE
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@employee_profiles_router.delete("/{employee_id}")
async def delete_employee_profile(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete an employee profile by ID."""
    try:
        if not employee_id or employee_id == "undefined":
            raise HTTPException(status_code=400, detail="Employee ID is required")
            
        try:
            employee_id_int = int(employee_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid employee ID format")
            
        employee = db.query(Medewerker).filter(Medewerker.id == employee_id_int).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Employee profile not found")
        
        # Delete the employee profile
        db.delete(employee)
        db.commit()
        
        return {"message": "Employee profile deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# Functie om de start- en einddatum van een vierwekenperiode te berekenen
def get_period_dates(year: int, periode: int) -> (date, date):
    if periode < 1 or periode > 13:
        raise ValueError("Periode moet tussen 1 en 13 liggen.")
    if periode <= 12:
        start = date(year, 1, 1) + timedelta(days=(periode - 1) * 28)
        end = start + timedelta(days=27)
    else:
        start = date(year, 1, 1) + timedelta(days=12 * 28)
        end = date(year, 12, 31)
    return start, end


@payroll_router.get("/", response_model=List[PayrollEntry])
async def get_payroll(
        year: Optional[int] = Query(None, description="Het jaar waarvoor de loonstrook wordt gegenereerd")
):
    """
    Genereer de loonstrook (mutatieblad) per medewerker voor het gehele jaar.
    De shifts worden automatisch opgedeeld in 13 vierwekenperiodes:
      - Periode 1 t/m 12: exact 28 dagen.
      - Periode 13: de rest van het jaar.

    Voor elke shift binnen een periode worden:
      - Gewerkte uren berekend (met correctie voor overmiddernacht) via calculate_hours.
      - Bonuspercentage bepaald via get_bonus_percentage.
      - Reiskosten berekend als: 2 * min(reiskilometers, MAX_DISTANCE) * TRAVEL_RATE.

    De vaste verloningsgegevens (zoals telefoonvergoeding, maaltijdvergoeding, de-minimis bonus en WKR-toeslag)
    worden automatisch uit employee_profiles gehaald.

    De output bevat per medewerker per periode:
      - Personeelsnummer, Naam, Uurloner-status,
      - Aantal gewerkte dagen, totaal gewerkte uren,
      - Totaal reiskosten, totaal per uur vergoedingen,
      - Gemiddeld bonuspercentage, basisloon en totaalloon,
      - En de periode-informatie (periode, periode_start en periode_end).
    """
    if year is None:
        year = date.today().year

    payroll_entries = []
    # Loop door alle 13 periodes van het jaar
    for periode in range(1, 14):
        try:
            start_date, end_date = get_period_dates(year, periode)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        period_payroll: Dict[str, PayrollEntry] = {}
        # Loop over alle shifts en filter die binnen de periode vallen
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
            # Voeg de gegevens per medewerker toe
            for employee in shift.get("employee_ids", []):
                profile = employee_profiles.get(employee)
                if profile is None:
                    continue
                hourly_allowance = profile.get("hourly_allowance", BASE_WAGE)
                naam = profile.get("naam", employee)
                if employee not in period_payroll:
                    period_payroll[employee] = PayrollEntry(
                        employee_id=employee,
                        personeelsnummer=profile.get("personeelsnummer", 0),
                        naam=naam,
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
                        opmerkingen=""
                    )
                entry = period_payroll[employee]
                entry.total_days += 1  # Elke shift telt als 1 werkdag (aanpassen indien nodig)
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
        # Bereken per medewerker de overige loongegevens voor deze periode
        for entry in period_payroll.values():
            profile = employee_profiles.get(entry.employee_id, {})
            hourly_allowance = profile.get("hourly_allowance", BASE_WAGE)
            entry.base_pay = entry.total_hours * hourly_allowance
            total_bonus = sum(s["bonus"] for s in entry.shifts)
            avg_bonus = total_bonus / len(entry.shifts) if entry.shifts else 0.0
            entry.bonus_percentage = avg_bonus
            entry.total_pay = entry.base_pay * (1 + avg_bonus) + entry.total_travel_cost
            entry_dict = entry.dict()
            entry_dict["periode"] = periode
            entry_dict["periode_start"] = start_date.isoformat()
            entry_dict["periode_end"] = end_date.isoformat()
            payroll_entries.append(entry_dict)
    if not payroll_entries:
        raise HTTPException(status_code=404, detail="Geen verloningsgegevens gevonden")
    return payroll_entries
