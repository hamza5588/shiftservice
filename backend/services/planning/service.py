from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user, require_roles
from .models import Shift as DBShift
from .schemas import ShiftBase, ShiftCreate, ShiftResponse, Shift
from models import User

router = APIRouter(
    prefix="/planning",
    tags=["planning"]
)

def times_overlap(start1: str, end1: str, start2: str, end2: str) -> bool:
    """
    Check if two time intervals overlap.
    Times are expected in "HH:MM" format.
    """
    start1_time = datetime.strptime(start1, "%H:%M").time()
    end1_time = datetime.strptime(end1, "%H:%M").time()
    start2_time = datetime.strptime(start2, "%H:%M").time()
    end2_time = datetime.strptime(end2, "%H:%M").time()
    
    return start1_time < end2_time and start2_time < end1_time

@router.get("/", response_model=List[ShiftResponse])
async def get_shifts(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all shifts."""
    db_shifts = db.query(DBShift).all()
    
    shifts = []
    for db_shift in db_shifts:
        shift = ShiftResponse(
            shift_date=db_shift.datum,
            start_time=datetime.strptime(db_shift.start_tijd, "%H:%M").time(),
            end_time=datetime.strptime(db_shift.eind_tijd, "%H:%M").time(),
            location=db_shift.locatie,
            status=db_shift.status,
            id=db_shift.id,
            employee_id=db_shift.medewerker_id,
            titel=db_shift.titel,
            stad=db_shift.stad,
            provincie=db_shift.provincie,
            adres=db_shift.adres,
            required_profile=db_shift.required_profile
        )
        shifts.append(shift)
    
    return shifts

@router.post("/", response_model=ShiftResponse, status_code=201)
async def create_shift(
    shift: ShiftCreate,
    current_user: dict = Depends(require_roles(["planner", "admin"])),
    db: Session = Depends(get_db)
):
    """Create a new shift."""
    if shift.employee_id:
        employee = db.query(User).filter(User.username == shift.employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Medewerker niet gevonden")

    db_shift = DBShift(
        datum=shift.shift_date,
        start_tijd=shift.start_time.strftime("%H:%M"),
        eind_tijd=shift.end_time.strftime("%H:%M"),
        locatie=shift.location,
        status=shift.status,
        medewerker_id=shift.employee_id,
        titel=shift.titel,
        stad=shift.stad,
        provincie=shift.provincie,
        adres=shift.adres,
        required_profile=shift.required_profile
    )
    
    db.add(db_shift)
    db.commit()
    db.refresh(db_shift)
    
    response = ShiftResponse(
        shift_date=db_shift.datum,
        start_time=datetime.strptime(db_shift.start_tijd, "%H:%M").time(),
        end_time=datetime.strptime(db_shift.eind_tijd, "%H:%M").time(),
        location=db_shift.locatie,
        status=db_shift.status,
        id=db_shift.id,
        employee_id=db_shift.medewerker_id,
        titel=db_shift.titel,
        stad=db_shift.stad,
        provincie=db_shift.provincie,
        adres=db_shift.adres,
        required_profile=db_shift.required_profile
    )
    
    return response

@router.get("/{shift_id}", response_model=ShiftResponse)
async def get_shift(
    shift_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific shift."""
    db_shift = db.query(DBShift).filter(DBShift.id == shift_id).first()
    if not db_shift:
        raise HTTPException(status_code=404, detail="Shift niet gevonden")
    
    shift = ShiftResponse(
        shift_date=db_shift.datum,
        start_time=datetime.strptime(db_shift.start_tijd, "%H:%M").time(),
        end_time=datetime.strptime(db_shift.eind_tijd, "%H:%M").time(),
        location=db_shift.locatie,
        status=db_shift.status,
        id=db_shift.id,
        employee_id=db_shift.medewerker_id,
        titel=db_shift.titel,
        stad=db_shift.stad,
        provincie=db_shift.provincie,
        adres=db_shift.adres,
        required_profile=db_shift.required_profile
    )
    
    return shift

@router.put("/{shift_id}", response_model=ShiftResponse)
async def update_shift(
    shift_id: int,
    shift_update: ShiftBase,
    current_user: dict = Depends(require_roles(["planner", "admin"])),
    db: Session = Depends(get_db)
):
    """Update an existing shift."""
    db_shift = db.query(DBShift).filter(DBShift.id == shift_id).first()
    if not db_shift:
        raise HTTPException(status_code=404, detail="Shift niet gevonden")

    if shift_update.employee_id:
        employee = db.query(User).filter(User.username == shift_update.employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Medewerker niet gevonden")

    db_shift.datum = shift_update.shift_date
    db_shift.start_tijd = shift_update.start_time.strftime("%H:%M")
    db_shift.eind_tijd = shift_update.end_time.strftime("%H:%M")
    db_shift.locatie = shift_update.location
    db_shift.status = shift_update.status
    db_shift.medewerker_id = shift_update.employee_id
    db_shift.titel = shift_update.titel
    db_shift.stad = shift_update.stad
    db_shift.provincie = shift_update.provincie
    db_shift.adres = shift_update.adres
    db_shift.required_profile = shift_update.required_profile

    db.commit()
    db.refresh(db_shift)
    
    shift = ShiftResponse(
        shift_date=db_shift.datum,
        start_time=datetime.strptime(db_shift.start_tijd, "%H:%M").time(),
        end_time=datetime.strptime(db_shift.eind_tijd, "%H:%M").time(),
        location=db_shift.locatie,
        status=db_shift.status,
        id=db_shift.id,
        employee_id=db_shift.medewerker_id,
        titel=db_shift.titel,
        stad=db_shift.stad,
        provincie=db_shift.provincie,
        adres=db_shift.adres,
        required_profile=db_shift.required_profile
    )
    
    return shift

@router.delete("/{shift_id}")
async def delete_shift(
    shift_id: int,
    current_user: dict = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    """Delete a shift."""
    db_shift = db.query(DBShift).filter(DBShift.id == shift_id).first()
    if not db_shift:
        raise HTTPException(status_code=404, detail="Shift niet gevonden")

    db.delete(db_shift)
    db.commit()
    return {"message": "Shift verwijderd"}

@router.post("/{shift_id}/approve", response_model=ShiftResponse)
async def approve_shift(
    shift_id: int,
    current_user: dict = Depends(require_roles(["planner", "admin"])),
    db: Session = Depends(get_db)
):
    """Approve a shift."""
    db_shift = db.query(DBShift).filter(DBShift.id == shift_id).first()
    if not db_shift:
        raise HTTPException(status_code=404, detail="Shift niet gevonden")
    
    db_shift.status = "approved"
    db.commit()
    db.refresh(db_shift)
    
    shift = ShiftResponse(
        shift_date=db_shift.datum,
        start_time=datetime.strptime(db_shift.start_tijd, "%H:%M").time(),
        end_time=datetime.strptime(db_shift.eind_tijd, "%H:%M").time(),
        location=db_shift.locatie,
        status=db_shift.status,
        id=db_shift.id,
        employee_id=db_shift.medewerker_id,
        titel=db_shift.titel,
        stad=db_shift.stad,
        provincie=db_shift.provincie,
        adres=db_shift.adres,
        required_profile=db_shift.required_profile
    )
    
    return shift

@router.post("/{shift_id}/reject", response_model=ShiftResponse)
async def reject_shift(
    shift_id: int,
    current_user: dict = Depends(require_roles(["planner", "admin"])),
    db: Session = Depends(get_db)
):
    """Reject a shift."""
    db_shift = db.query(DBShift).filter(DBShift.id == shift_id).first()
    if not db_shift:
        raise HTTPException(status_code=404, detail="Shift niet gevonden")
    
    db_shift.status = "rejected"
    db.commit()
    db.refresh(db_shift)
    
    shift = ShiftResponse(
        shift_date=db_shift.datum,
        start_time=datetime.strptime(db_shift.start_tijd, "%H:%M").time(),
        end_time=datetime.strptime(db_shift.eind_tijd, "%H:%M").time(),
        location=db_shift.locatie,
        status=db_shift.status,
        id=db_shift.id,
        employee_id=db_shift.medewerker_id,
        titel=db_shift.titel,
        stad=db_shift.stad,
        provincie=db_shift.provincie,
        adres=db_shift.adres,
        required_profile=db_shift.required_profile
    )
    
    return shift

@router.post("/{shift_id}/cancel", response_model=ShiftResponse)
async def cancel_shift(
    shift_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Cancel a shift."""
    db_shift = db.query(DBShift).filter(DBShift.id == shift_id).first()
    if not db_shift:
        raise HTTPException(status_code=404, detail="Shift niet gevonden")
    
    # Only allow cancellation if user is admin, planner, or the assigned employee
    if not (current_user["role"] in ["admin", "planner"] or 
            current_user["username"] == db_shift.medewerker_id):
        raise HTTPException(status_code=403, detail="Niet geautoriseerd om deze shift te annuleren")
    
    db_shift.status = "canceled"
    db.commit()
    db.refresh(db_shift)
    
    shift = ShiftResponse(
        shift_date=db_shift.datum,
        start_time=datetime.strptime(db_shift.start_tijd, "%H:%M").time(),
        end_time=datetime.strptime(db_shift.eind_tijd, "%H:%M").time(),
        location=db_shift.locatie,
        status=db_shift.status,
        id=db_shift.id,
        employee_id=db_shift.medewerker_id,
        titel=db_shift.titel,
        stad=db_shift.stad,
        provincie=db_shift.provincie,
        adres=db_shift.adres,
        required_profile=db_shift.required_profile
    )
    
    return shift

@router.get("/open/diensten", response_model=List[Shift])
async def get_open_diensten(
    stad: Optional[str] = Query(None, description="Filter op stad"),
    provincie: Optional[str] = Query(None, description="Filter op provincie"),
    max_distance: Optional[float] = Query(None, description="Maximum afstand in km"),
    pas_type: Optional[str] = Query(None, description="Filter op vereiste medewerkerprofiel"),
    db: Session = Depends(get_db)
):
    """Get all open shifts with optional filters."""
    query = db.query(DBShift).filter(DBShift.status == "open")
    
    if stad:
        query = query.filter(DBShift.stad == stad)
    if provincie:
        query = query.filter(DBShift.provincie == provincie)
    if pas_type:
        query = query.filter(DBShift.required_profile == pas_type)
    
    db_shifts = query.all()
    
    shifts = []
    for db_shift in db_shifts:
        shift = Shift(
            id=db_shift.id,
            shift_date=db_shift.datum,
            start_time=datetime.strptime(db_shift.start_tijd, "%H:%M").time(),
            end_time=datetime.strptime(db_shift.eind_tijd, "%H:%M").time(),
            location=db_shift.locatie,
            status=db_shift.status,
            employee_ids=[db_shift.medewerker_id] if db_shift.medewerker_id else [],
            titel=db_shift.titel,
            stad=db_shift.stad,
            provincie=db_shift.provincie,
            adres=db_shift.adres,
            required_profile=db_shift.required_profile
        )
        shifts.append(shift)
    
    return shifts

@router.get("/dienst/{shift_id}", response_model=Shift)
async def dienst_detail(
    shift_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific shift."""
    db_shift = db.query(DBShift).filter(DBShift.id == shift_id).first()
    if not db_shift:
        raise HTTPException(status_code=404, detail="Shift niet gevonden")
    
    shift = Shift(
        id=db_shift.id,
        shift_date=db_shift.datum,
        start_time=datetime.strptime(db_shift.start_tijd, "%H:%M").time(),
        end_time=datetime.strptime(db_shift.eind_tijd, "%H:%M").time(),
        location=db_shift.locatie,
        status=db_shift.status,
        employee_ids=[db_shift.medewerker_id] if db_shift.medewerker_id else [],
        titel=db_shift.titel,
        stad=db_shift.stad,
        provincie=db_shift.provincie,
        adres=db_shift.adres,
        required_profile=db_shift.required_profile
    )
    
    return shift 