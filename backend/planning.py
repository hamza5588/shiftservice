from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, time, datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import or_
from database import get_db
from models import Shift as DBShift, User, Location, AutoApproval
from auth import get_current_user, require_roles
from auto_approval import check_auto_approval_eligibility
import traceback

router = APIRouter(
    prefix="/planning",
    tags=["planning"]
)

class ShiftBase(BaseModel):
    shift_date: str
    start_time: str
    end_time: str
    location_id: int
    employee_id: Optional[str] = None
    status: str = "open"
    title: Optional[str] = None
    stad: Optional[str] = None
    provincie: Optional[str] = None
    adres: Optional[str] = None
    required_profile: Optional[str] = None
    reiskilometers: Optional[float] = None

    class Config:
        json_encoders = {
            date: lambda v: v.isoformat() if v else None,
            time: lambda v: v.strftime("%H:%M") if v else None
        }

class ShiftCreate(ShiftBase):
    pass

class ShiftResponse(ShiftBase):
    id: int
    location: Optional[str] = None
    location_details: Optional[dict] = None
    reiskilometers: Optional[float] = None
    assigned_by_admin: Optional[bool] = None
    employee_id: Optional[str] = None
    titel: str = ""
    stad: str = ""
    provincie: Optional[str] = ""
    adres: str = ""
    required_profile: Optional[str] = None

    class Config:
        orm_mode = True
        json_encoders = {
            date: lambda v: v.isoformat() if v else None,
            time: lambda v: v.strftime("%H:%M") if v else None
        }

class Shift(BaseModel):
    id: int = 0
    employee_ids: List[str] = []
    shift_date: date
    start_time: time
    end_time: time
    location_id: int
    location: Optional[str] = None
    location_details: Optional[dict] = None
    status: str = "pending"
    titel: Optional[str] = None
    stad: Optional[str] = None
    provincie: Optional[str] = None
    adres: Optional[str] = None
    required_profile: Optional[str] = None

class BulkShiftCreate(BaseModel):
    start_date: str
    end_date: str
    start_time: str
    end_time: str
    location_id: int
    num_employees: int
    selected_days: List[int]  # 0 = Monday, 6 = Sunday
    title: Optional[str] = None
    required_profile: Optional[str] = None
    reiskilometers: Optional[float] = None

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
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Haal alle shifts op."""
    try:
        # Check if user has permission to view shifts
        if not current_user or not hasattr(current_user, 'roles'):
            raise HTTPException(
                status_code=403,
                detail="User not authenticated or missing roles"
            )

        # Check if user has any of the required roles
        user_roles = [role.name for role in current_user.roles] if hasattr(current_user.roles, '__iter__') else []
        if not any(role in user_roles for role in ["employee", "planner", "admin"]):
            raise HTTPException(
                status_code=403,
                detail="You don't have permission to view shifts"
            )

        db_shifts = db.query(DBShift).all()
        print(f"Found {len(db_shifts)} shifts in database")
        
        # Convert SQLAlchemy models to Pydantic models for response
        shifts = []
        for db_shift in db_shifts:
            try:
                print(f"Processing shift {db_shift.id}")
                print(f"Shift data: {db_shift.__dict__}")
                
                # Get location details if available
                location_details = None
                if db_shift.location:
                    location_details = {
                        "id": db_shift.location.id,
                        "naam": db_shift.location.naam,
                        "adres": db_shift.location.adres,
                        "stad": db_shift.location.stad,
                        "provincie": db_shift.location.provincie
                    }
                
                # Convert the shift date to ISO format string
                shift_date = db_shift.datum
                if isinstance(shift_date, date):
                    shift_date = shift_date.isoformat()
                
                # Safely convert employee_id
                employee_id = None
                if db_shift.medewerker_id is not None:
                    employee_id = str(db_shift.medewerker_id)
                
                # Safely convert other fields with defaults
                titel = str(db_shift.titel) if db_shift.titel is not None else ""
                stad = str(db_shift.stad) if db_shift.stad is not None else ""
                provincie = str(db_shift.provincie) if db_shift.provincie is not None else ""
                adres = str(db_shift.adres) if db_shift.adres is not None else ""
                required_profile = str(db_shift.required_profile) if db_shift.required_profile is not None else None
                location = str(db_shift.locatie) if db_shift.locatie is not None else None
                
                # Ensure all required fields are present
                shift_data = {
                    "shift_date": shift_date,
                    "start_time": str(db_shift.start_tijd),
                    "end_time": str(db_shift.eind_tijd),
                    "location_id": db_shift.location_id,
                    "status": db_shift.status,
                    "id": db_shift.id,
                    "employee_id": employee_id,
                    "titel": titel,
                    "stad": stad,
                    "provincie": provincie,
                    "adres": adres,
                    "required_profile": required_profile,
                    "location": location,
                    "location_details": location_details
                }
                
                print(f"Converted shift data: {shift_data}")
                
                shift = ShiftResponse(**shift_data)
                shifts.append(shift)
            except Exception as e:
                print(f"Error converting shift {db_shift.id}: {str(e)}")
                print(f"Error type: {type(e)}")
                print(f"Error args: {e.args}")
                print(f"Shift data: {db_shift.__dict__}")
                continue  # Skip this shift instead of failing the entire request
        
        print(f"Successfully converted {len(shifts)} shifts")
        return shifts
    except Exception as e:
        print(f"Error in get_shifts: {str(e)}")
        print(f"Error type: {type(e)}")
        print(f"Error args: {e.args}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/my-shifts", response_model=List[ShiftResponse])
async def get_my_shifts(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Haal alle shifts op voor de ingelogde medewerker."""
    if "employee" not in current_user["roles"]:
        raise HTTPException(status_code=403, detail="Only employees can view their own shifts")
    
    db_shifts = db.query(DBShift).filter(DBShift.medewerker_id == current_user["username"]).all()
    
    # Convert SQLAlchemy models to Pydantic models for response
    shifts = []
    for db_shift in db_shifts:
        shift = ShiftResponse(
            shift_date=db_shift.datum,
            start_time=datetime.strptime(db_shift.start_tijd, "%H:%M").time(),
            end_time=datetime.strptime(db_shift.eind_tijd, "%H:%M").time(),
            location_id=db_shift.location_id,
            status=db_shift.status,
            id=db_shift.id,
            employee_id=db_shift.medewerker_id,
            titel=db_shift.titel,
            stad=db_shift.stad,
            provincie=db_shift.provincie,
            adres=db_shift.adres,
            required_profile=db_shift.required_profile,
            reiskilometers=db_shift.reiskilometers or 0,
            assigned_by_admin=db_shift.assigned_by_admin or False
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
        location_id=db_shift.location_id,
        status=db_shift.status,
        id=db_shift.id
    )
    
    return shift

@router.post("/", response_model=ShiftResponse)
async def create_shift(shift: ShiftCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        print(f"Creating shift with data: {shift.dict()}")
        print(f"Employee ID from request: {shift.employee_id}")
        
        # Check if location exists
        location = db.query(Location).filter(Location.id == shift.location_id).first()
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        print(f"Found location: {location.naam}")

        # If employee_id is provided, verify it exists and check auto-approval
        medewerker_id = None
        if shift.employee_id:
            try:
                print(f"Looking up employee with ID/username: {shift.employee_id}")
                # Try to find employee by both ID and username
                employee = db.query(User).filter(
                    (User.id == shift.employee_id) | (User.username == shift.employee_id)
                ).first()
                if not employee:
                    print(f"No employee found with ID/username: {shift.employee_id}")
                    raise HTTPException(status_code=404, detail=f"Employee not found with ID/username: {shift.employee_id}")
                
                print(f"Found employee: {employee.username}, ID: {employee.id}")
                medewerker_id = employee.username  # Use username for consistency

                # Check if this employee has auto-approval for this location
                print(f"Checking auto-approval for employee username {employee.username} at location {location.naam}")
                auto_approval = db.query(AutoApproval).filter(
                    AutoApproval.employee_id == employee.username,
                    AutoApproval.location == location.naam,
                    AutoApproval.auto_approve == True
                ).first()

                if auto_approval:
                    print("Auto-approval found, setting status to approved")
                    shift.status = "approved"
                else:
                    print("No auto-approval found, status remains:", shift.status)
            except Exception as e:
                print(f"Error processing employee: {str(e)}")
                print(f"Error type: {type(e)}")
                print(f"Error args: {e.args}")
                raise HTTPException(status_code=400, detail=f"Error processing employee: {str(e)}")

        # Format times to HH:MM format
        start_time = ':'.join(shift.start_time.split(':')[:2])  # Keep only hours and minutes
        end_time = ':'.join(shift.end_time.split(':')[:2])

        print(f"Creating shift with status: {shift.status}")
        print(f"Using medewerker_id: {medewerker_id}")

        # Create the shift in the database
        db_shift = DBShift(
            datum=shift.shift_date,
            start_tijd=start_time,
            eind_tijd=end_time,
            location_id=shift.location_id,
            locatie=location.naam,
            medewerker_id=medewerker_id,
            status=shift.status,
            titel=shift.title,
            stad=shift.stad,
            provincie=shift.provincie,
            adres=shift.adres,
            required_profile=shift.required_profile,
            reiskilometers=float(shift.reiskilometers) if shift.reiskilometers is not None else None
        )
        
        print(f"Created DBShift object: {db_shift.__dict__}")
        
        db.add(db_shift)
        db.commit()
        db.refresh(db_shift)

        print(f"Created shift with status: {db_shift.status}")

        # Convert date to string if it's a date object
        shift_date = db_shift.datum
        if isinstance(shift_date, date):
            shift_date = shift_date.isoformat()

        # Return the created shift with proper string formats
        response = ShiftResponse(
            shift_date=shift_date,
            start_time=db_shift.start_tijd,
            end_time=db_shift.eind_tijd,
            location_id=db_shift.location_id,
            status=db_shift.status,
            id=db_shift.id,
            employee_id=db_shift.medewerker_id,
            title=db_shift.titel or "",
            stad=db_shift.stad or "",
            provincie=db_shift.provincie or "",
            adres=db_shift.adres or "",
            required_profile=db_shift.required_profile,
            location=db_shift.locatie,
            reiskilometers=db_shift.reiskilometers
        )
        print(f"Returning response: {response.dict()}")
        return response
    except Exception as e:
        db.rollback()
        print(f"Error creating shift: {str(e)}")
        print(f"Error type: {type(e)}")
        print(f"Error args: {e.args}")
        print(f"Error traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/available-shifts", response_model=List[ShiftResponse])
async def get_available_shifts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all available shifts that employees can request (unassigned or assigned to current user)."""
    try:
        print(f"Current user: {current_user}")
        if not hasattr(current_user, 'roles'):
            print("Current user does not have roles attribute")
            raise HTTPException(
                status_code=403, 
                detail="User does not have required permissions"
            )
        print(f"User roles: {current_user.roles}")
        user_roles = [role.name for role in current_user.roles] if hasattr(current_user.roles, '__iter__') else []
        if not any(role in user_roles for role in ["employee", "planner", "admin"]):
            raise HTTPException(
                status_code=403, 
                detail="You don't have permission to view available shifts"
            )
        # Show shifts that are open or pending and either unassigned or assigned to the current user
        db_shifts = db.query(DBShift).filter(
            DBShift.status.in_(["open", "pending"]),
            or_(DBShift.medewerker_id == None, DBShift.medewerker_id == current_user.username)
        ).all()
        print(f"Found {len(db_shifts)} available (unassigned or assigned to current user) shifts")
        
        # Convert SQLAlchemy models to Pydantic models for response
        shifts = []
        for db_shift in db_shifts:
            try:
                # Get location details if available
                location_details = None
                if db_shift.location:
                    location_details = {
                        "id": db_shift.location.id,
                        "naam": db_shift.location.naam,
                        "adres": db_shift.location.adres,
                        "stad": db_shift.location.stad,
                        "provincie": db_shift.location.provincie
                    }
                
                # Convert the shift date to ISO format string
                shift_date = db_shift.datum
                if isinstance(shift_date, date):
                    shift_date = shift_date.isoformat()
                
                # Create shift data with default values for missing fields
                shift_data = {
                    "id": db_shift.id,
                    "shift_date": shift_date,
                    "start_time": str(db_shift.start_tijd),
                    "end_time": str(db_shift.eind_tijd),
                    "location_id": db_shift.location_id,
                    "status": db_shift.status,
                    "employee_id": db_shift.medewerker_id,
                    "titel": db_shift.titel or "",
                    "stad": db_shift.stad or "",
                    "provincie": db_shift.provincie or "",
                    "adres": db_shift.adres or "",
                    "required_profile": db_shift.required_profile,
                    "location": db_shift.locatie,
                    "location_details": location_details,
                    "reiskilometers": getattr(db_shift, 'reiskilometers', None),
                    "assigned_by_admin": getattr(db_shift, 'assigned_by_admin', None)
                }
                
                print(f"Converting shift data: {shift_data}")
                
                shift = ShiftResponse(**shift_data)
                shifts.append(shift)
            except Exception as e:
                print(f"Error converting shift {db_shift.id}: {str(e)}")
                print(f"Shift data: {db_shift.__dict__}")
                continue  # Skip this shift instead of failing the entire request
        
        print(f"Successfully converted {len(shifts)} shifts")
        return shifts
    except Exception as e:
        print(f"Error in get_available_shifts: {str(e)}")
        print(f"Error type: {type(e)}")
        print(f"Error args: {e.args}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.get("/{shift_id}", response_model=ShiftResponse)
async def get_shift(
    shift_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific shift by ID."""
    db_shift = db.query(DBShift).filter(DBShift.id == shift_id).first()
    if not db_shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    
    # Get location details if available
    location_details = None
    if db_shift.location:
        location_details = {
            "id": db_shift.location.id,
            "naam": db_shift.location.naam,
            "adres": db_shift.location.adres,
            "stad": db_shift.location.stad,
            "provincie": db_shift.location.provincie
        }
    
    # Convert the shift date to ISO format string
    shift_date = db_shift.datum
    if isinstance(shift_date, date):
        shift_date = shift_date.isoformat()
    
    # Safely convert employee_id
    employee_id = None
    if db_shift.medewerker_id is not None:
        employee_id = str(db_shift.medewerker_id)
    
    # Create shift data with default values for missing fields
    shift_data = {
        "id": db_shift.id,
        "shift_date": shift_date,
        "start_time": str(db_shift.start_tijd),
        "end_time": str(db_shift.eind_tijd),
        "location_id": db_shift.location_id,
        "status": db_shift.status,
        "employee_id": employee_id,
        "titel": db_shift.titel or "",
        "stad": db_shift.stad or "",
        "provincie": db_shift.provincie or "",
        "adres": db_shift.adres or "",
        "required_profile": db_shift.required_profile,
        "location": db_shift.locatie,
        "location_details": location_details,
        "reiskilometers": getattr(db_shift, 'reiskilometers', None),  # Safely get reiskilometers if it exists
        "assigned_by_admin": getattr(db_shift, 'assigned_by_admin', None)  # Safely get assigned_by_admin if it exists
    }
    
    return ShiftResponse(**shift_data)

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

    # Get location details
    location = db.query(Location).filter(Location.id == shift_update.location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    if shift_update.employee_id:
        # Check if employee exists
        employee = db.query(User).filter(User.username == shift_update.employee_id).first()
        if not employee:
            raise HTTPException(status_code=404, detail="Medewerker niet gevonden")
        # Use the employee's username as the medewerker_id
        shift_update.employee_id = employee.username

    # Format times to HH:MM format
    start_time = ':'.join(shift_update.start_time.split(':')[:2])  # Keep only hours and minutes
    end_time = ':'.join(shift_update.end_time.split(':')[:2])

    # Update the SQLAlchemy model with the new values
    db_shift.datum = shift_update.shift_date
    db_shift.start_tijd = start_time
    db_shift.eind_tijd = end_time
    db_shift.location_id = shift_update.location_id
    db_shift.locatie = location.naam  # Update the location name
    db_shift.status = shift_update.status
    db_shift.medewerker_id = shift_update.employee_id
    db_shift.titel = shift_update.title
    db_shift.stad = shift_update.stad
    db_shift.provincie = shift_update.provincie
    db_shift.adres = shift_update.adres
    db_shift.required_profile = shift_update.required_profile

    db.commit()
    db.refresh(db_shift)
    
    # Get location details for response
    location_details = None
    if db_shift.location:
        location_details = {
            "id": db_shift.location.id,
            "naam": db_shift.location.naam,
            "adres": db_shift.location.adres,
            "stad": db_shift.location.stad,
            "provincie": db_shift.location.provincie
        }
    
    # Convert SQLAlchemy model to Pydantic model for response
    shift = ShiftResponse(
        shift_date=db_shift.datum.isoformat() if isinstance(db_shift.datum, date) else db_shift.datum,
        start_time=db_shift.start_tijd,
        end_time=db_shift.eind_tijd,
        location_id=db_shift.location_id,
        status=db_shift.status,
        id=db_shift.id,
        employee_id=db_shift.medewerker_id,
        titel=db_shift.titel,
        stad=db_shift.stad,
        provincie=db_shift.provincie,
        adres=db_shift.adres,
        required_profile=db_shift.required_profile,
        location=db_shift.locatie,
        location_details=location_details
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
            location_id=db_shift.location_id,
            status=db_shift.status,
            id=db_shift.id
        )
        shifts.append(shift)
    
    return shifts

@router.post("/bulk", response_model=List[ShiftResponse])
async def create_bulk_shifts(
    bulk_shift: BulkShiftCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(["admin", "planner"]))
):
    """Create multiple shifts for selected days within a date range."""
    try:
        # Convert dates to datetime objects
        start_date = datetime.strptime(bulk_shift.start_date, "%Y-%m-%d").date()
        end_date = datetime.strptime(bulk_shift.end_date, "%Y-%m-%d").date()
        
        # Get location details
        location = db.query(Location).filter(Location.id == bulk_shift.location_id).first()
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        # Format times to HH:MM format
        start_time = ':'.join(bulk_shift.start_time.split(':')[:2])
        end_time = ':'.join(bulk_shift.end_time.split(':')[:2])
        
        created_shifts = []
        current_date = start_date
        
        # Create shifts for each day in the range that matches selected days
        while current_date <= end_date:
            # Check if current day is in selected days (0 = Monday, 6 = Sunday)
            if current_date.weekday() in bulk_shift.selected_days:
                # Create the specified number of shifts for this day
                for _ in range(bulk_shift.num_employees):
                    db_shift = DBShift(
                        datum=current_date,
                        start_tijd=start_time,
                        eind_tijd=end_time,
                        location_id=bulk_shift.location_id,
                        locatie=location.naam,
                        medewerker_id=None,  # No employee assigned initially
                        status="open",
                        titel=bulk_shift.title,
                        stad=location.stad,
                        provincie=location.provincie,
                        adres=location.adres,
                        required_profile=bulk_shift.required_profile,
                        reiskilometers=bulk_shift.reiskilometers
                    )
                    
                    db.add(db_shift)
                    created_shifts.append(db_shift)
            
            # Move to next day
            current_date += timedelta(days=1)
        
        db.commit()
        
        # Refresh all created shifts to get their IDs
        for shift in created_shifts:
            db.refresh(shift)
        
        # Convert to response model
        response_shifts = []
        for shift in created_shifts:
            response_shifts.append(ShiftResponse(
                id=shift.id,
                shift_date=shift.datum.isoformat(),
                start_time=shift.start_tijd,
                end_time=shift.eind_tijd,
                location_id=shift.location_id,
                status=shift.status,
                employee_id=shift.medewerker_id,
                title=shift.titel,
                stad=shift.stad or "",
                provincie=shift.provincie or "",
                adres=shift.adres or "",
                required_profile=shift.required_profile,
                location=shift.locatie,
                reiskilometers=shift.reiskilometers
            ))
        
        return response_shifts
        
    except Exception as e:
        db.rollback()
        print(f"Error creating bulk shifts: {str(e)}")
        print(f"Error type: {type(e)}")
        print(f"Error args: {e.args}")
        print(f"Error traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
