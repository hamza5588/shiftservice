from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, time, datetime, timedelta
from sqlalchemy.orm import Session
from database import get_db
from models import Shift as DBShift, User
from auth import get_current_user, require_roles

router = APIRouter(
    prefix="/planning",
    tags=["planning"]
)

class ShiftBase(BaseModel):
    shift_date: date
    start_time: time
    end_time: time
    location: str
    employee_id: Optional[str] = None
    status: str = "open"

class ShiftCreate(ShiftBase):
    pass

class ShiftResponse(ShiftBase):
    id: int

    class Config:
        orm_mode = True

class Shift(BaseModel):
    id: int = 0  # Wordt automatisch ingesteld bij creatie
    employee_ids: List[str] = []  # Meerdere medewerkers kunnen toegewezen worden; leeg betekent open dienst
    shift_date: date
    start_time: time
    end_time: time
    location: str
    status: str = "pending"  # 'pending', 'approved', 'rejected', 'canceled'
    # Extra locatiegegevens:
    titel: Optional[str] = None
    stad: Optional[str] = None
    provincie: Optional[str] = None
    adres: Optional[str] = None
    # Nieuw: vereiste medewerkerprofiel voor deze shift
    required_profile: Optional[str] = None

# In-memory database
fake_shifts_db = []
next_shift_id = 1  # Houdt de volgende beschikbare ID bij

def times_overlap(start1: time, end1: time, start2: time, end2: time) -> bool:
    """
    Controleer of twee tijdsintervallen overlappen.
    We gaan ervan uit dat de shifts op dezelfde dag plaatsvinden.
    """
    return start1 < end2 and start2 < end1

@router.get("/", response_model=List[ShiftResponse])
async def get_shifts(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Haal alle shifts op."""
    db_shifts = db.query(DBShift).all()
    
    # Convert SQLAlchemy models to Pydantic models for response
    shifts = []
    for db_shift in db_shifts:
        shift = ShiftResponse(
            shift_date=db_shift.datum,
            start_time=datetime.strptime(db_shift.start_tijd, "%H:%M").time(),
            end_time=datetime.strptime(db_shift.eind_tijd, "%H:%M").time(),
            location=db_shift.locatie,
            status=db_shift.status,
            id=db_shift.id
        )
        shifts.append(shift)
    
    return shifts

@router.get("/my-shifts", response_model=List[ShiftResponse])
async def get_my_shifts(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Haal alle shifts op voor de ingelogde medewerker."""
    if "employee" not in current_user["roles"]:
        raise HTTPException(status_code=403, detail="Only employees can view their own shifts")
    
    db_shifts = db.query(DBShift).filter(DBShift.employee_id == current_user["id"]).all()
    
    # Convert SQLAlchemy models to Pydantic models for response
    shifts = []
    for db_shift in db_shifts:
        shift = ShiftResponse(
            shift_date=db_shift.datum,
            start_time=datetime.strptime(db_shift.start_tijd, "%H:%M").time(),
            end_time=datetime.strptime(db_shift.eind_tijd, "%H:%M").time(),
            location=db_shift.locatie,
            status=db_shift.status,
            id=db_shift.id
        )
        shifts.append(shift)
    
    return shifts

@router.get("/my-shifts/{shift_id}", response_model=ShiftResponse)
async def get_my_shift(
    shift_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Haal een specifieke shift op voor de ingelogde medewerker."""
    if "employee" not in current_user["roles"]:
        raise HTTPException(status_code=403, detail="Only employees can view their own shifts")
    
    db_shift = db.query(DBShift).filter(
        DBShift.id == shift_id,
        DBShift.employee_id == current_user["id"]
    ).first()
    
    if not db_shift:
        raise HTTPException(status_code=404, detail="Shift not found or not assigned to you")
    
    # Convert SQLAlchemy model to Pydantic model for response
    shift = ShiftResponse(
        shift_date=db_shift.datum,
        start_time=datetime.strptime(db_shift.start_tijd, "%H:%M").time(),
        end_time=datetime.strptime(db_shift.eind_tijd, "%H:%M").time(),
        location=db_shift.locatie,
        status=db_shift.status,
        id=db_shift.id
    )
    
    return shift

@router.post("/", response_model=ShiftResponse, status_code=201)
async def create_shift(
    shift: ShiftCreate,
    current_user: dict = Depends(require_roles(["planner", "admin"])),
    db: Session = Depends(get_db)
):
    """Maak een nieuwe shift aan."""
    if shift.employee_id:
        # Check if employee exists
        employee = db.query(User).filter(User.username == shift.employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Medewerker niet gevonden")

    # Create SQLAlchemy Shift model instance with correct field names
    db_shift = DBShift(
        datum=shift.shift_date,
        start_tijd=shift.start_time.strftime("%H:%M"),
        eind_tijd=shift.end_time.strftime("%H:%M"),
        locatie=shift.location,
        status=shift.status
    )
    
    db.add(db_shift)
    db.commit()
    db.refresh(db_shift)
    
    # Convert SQLAlchemy model to Pydantic model for response
    response = ShiftResponse(
        shift_date=db_shift.datum,
        start_time=datetime.strptime(db_shift.start_tijd, "%H:%M").time(),
        end_time=datetime.strptime(db_shift.eind_tijd, "%H:%M").time(),
        location=db_shift.locatie,
        status=db_shift.status,
        id=db_shift.id
    )
    
    return response

@router.get("/{shift_id}", response_model=ShiftResponse)
async def get_shift(
    shift_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Haal een specifieke shift op."""
    db_shift = db.query(DBShift).filter(DBShift.id == shift_id).first()
    if not db_shift:
        raise HTTPException(status_code=404, detail="Shift niet gevonden")
    
    # Convert SQLAlchemy model to Pydantic model for response
    shift = ShiftResponse(
        shift_date=db_shift.datum,
        start_time=datetime.strptime(db_shift.start_tijd, "%H:%M").time(),
        end_time=datetime.strptime(db_shift.eind_tijd, "%H:%M").time(),
        location=db_shift.locatie,
        status=db_shift.status,
        id=db_shift.id
    )
    
    return shift

@router.put("/{shift_id}", response_model=ShiftResponse)
async def update_shift(
    shift_id: int,
    shift_update: ShiftBase,
    current_user: dict = Depends(require_roles(["planner", "admin"])),
    db: Session = Depends(get_db)
):
    """Update een bestaande shift."""
    db_shift = db.query(DBShift).filter(DBShift.id == shift_id).first()
    if not db_shift:
        raise HTTPException(status_code=404, detail="Shift niet gevonden")

    if shift_update.employee_id:
        # Check if employee exists
        employee = db.query(User).filter(User.username == shift_update.employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Medewerker niet gevonden")

    # Update the SQLAlchemy model with the new values
    db_shift.datum = shift_update.shift_date
    db_shift.start_tijd = shift_update.start_time.strftime("%H:%M")
    db_shift.eind_tijd = shift_update.end_time.strftime("%H:%M")
    db_shift.locatie = shift_update.location
    db_shift.status = shift_update.status

    db.commit()
    db.refresh(db_shift)
    
    # Convert SQLAlchemy model to Pydantic model for response
    shift = ShiftResponse(
        shift_date=db_shift.datum,
        start_time=datetime.strptime(db_shift.start_tijd, "%H:%M").time(),
        end_time=datetime.strptime(db_shift.eind_tijd, "%H:%M").time(),
        location=db_shift.locatie,
        status=db_shift.status,
        id=db_shift.id
    )
    
    return shift

@router.delete("/{shift_id}")
async def delete_shift(
    shift_id: int,
    current_user: dict = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """Verwijder een shift."""
    db_shift = db.query(DBShift).filter(DBShift.id == shift_id).first()
    if not db_shift:
        raise HTTPException(status_code=404, detail="Shift niet gevonden")

    db.delete(db_shift)
    db.commit()
    return {"message": "Shift verwijderd"}

@router.post("/{shift_id}/approve", response_model=Shift)
async def approve_shift(shift_id: int, current_user: dict = Depends(require_roles(["planner", "admin"]))):
    """Keur een shift goed (zet status op 'approved')."""
    for shift in fake_shifts_db:
        if shift["id"] == shift_id:
            shift["status"] = "approved"
            return shift
    raise HTTPException(status_code=404, detail="Shift not found")

@router.post("/{shift_id}/reject", response_model=Shift)
async def reject_shift(shift_id: int, current_user: dict = Depends(require_roles(["planner", "admin"]))):
    """Weiger een shift (zet status op 'rejected')."""
    for shift in fake_shifts_db:
        if shift["id"] == shift_id:
            shift["status"] = "rejected"
            return shift
    raise HTTPException(status_code=404, detail="Shift not found")

@router.post("/{shift_id}/cancel", response_model=Shift)
async def cancel_shift(shift_id: int, current_user: dict = Depends(get_current_user)):
    """
    Annuleer een shift.
    Medewerkers kunnen een shift annuleren als dit minstens 48 uur van tevoren gebeurt.
    Als de annulering binnen 48 uur plaatsvindt, is deze actie alleen toegestaan als de huidige gebruiker een planner of admin is.
    """
    for shift in fake_shifts_db:
        if shift["id"] == shift_id:
            shift_start_datetime = datetime.combine(shift["shift_date"], shift["start_time"])
            now = datetime.utcnow()
            if (shift_start_datetime - now) >= timedelta(hours=48):
                shift["status"] = "canceled"
                return shift
            else:
                if current_user["role"] not in ["planner", "admin"]:
                    raise HTTPException(status_code=403, detail="Cancellation within 48 hours allowed only for planners or admins.")
                shift["status"] = "canceled"
                return shift
    raise HTTPException(status_code=404, detail="Shift not found")

@router.get("/open/diensten", response_model=List[Shift])
async def get_open_diensten(
    stad: Optional[str] = Query(None, description="Filter op stad"),
    provincie: Optional[str] = Query(None, description="Filter op provincie"),
    max_distance: Optional[float] = Query(None, description="Maximum afstand in km"),
    pas_type: Optional[str] = Query(None, description="Filter op vereiste medewerkerprofiel")
):
    """
    Haal alle open diensten (shifts met status 'open' of 'pending') op.
    Optioneel kun je filteren op stad, provincie, maximum afstand (reiskilometers) en pas type.
    """
    open_shifts = [shift for shift in fake_shifts_db if shift.get("status") in ["open", "pending"]]
    if stad:
        open_shifts = [shift for shift in open_shifts if shift.get("stad") == stad]
    if provincie:
        open_shifts = [shift for shift in open_shifts if shift.get("provincie") == provincie]
    if max_distance:
        # Hier zou je een afstandsberekening kunnen implementeren
        pass
    if pas_type:
        open_shifts = [shift for shift in open_shifts if shift.get("required_profile") == pas_type]
    return open_shifts

@router.get("/dienst/{shift_id}", response_model=Shift)
async def dienst_detail(shift_id: int):
    """
    Haal de volledige details van een dienst op, inclusief locatiegegevens (titel, stad, provincie, adres).
    """
    for shift in fake_shifts_db:
        if shift["id"] == shift_id:
            return shift
    raise HTTPException(status_code=404, detail="Dienst niet gevonden")

@router.get("/my-shifts/", response_model=List[ShiftResponse])
async def get_my_shifts(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get shifts for the current user."""
    # Get the employee profile for the current user
    employee = db.query(User).filter(User.email == current_user.email).first()
    if not employee:
        return []
    
    # Get shifts for this employee
    db_shifts = db.query(DBShift).filter(DBShift.employee_id == employee.id).all()
    
    # Convert SQLAlchemy models to Pydantic models for response
    shifts = []
    for db_shift in db_shifts:
        shift = ShiftResponse(
            shift_date=db_shift.datum,
            start_time=datetime.strptime(db_shift.start_tijd, "%H:%M").time(),
            end_time=datetime.strptime(db_shift.eind_tijd, "%H:%M").time(),
            location=db_shift.locatie,
            status=db_shift.status,
            id=db_shift.id
        )
        shifts.append(shift)
    
    return shifts
