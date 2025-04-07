from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date
from auth import get_current_user, require_roles
from database import get_db
from sqlalchemy.orm import Session
from models import User, Shift as DBShift, Dienstaanvraag as DBDienstAanvraag, Opdrachtgever
from email_utils import send_shift_registration_email, send_shift_unregistration_email

router = APIRouter(
    prefix="/dienstaanvragen",
    tags=["dienstaanvragen"]
)


class Dienstaanvraag(BaseModel):
    id: int = 0  # Wordt automatisch ingesteld bij creatie
    shift_id: int  # De ID van de shift waarop wordt gereageerd
    employee_id: str = ""  # Wordt automatisch ingesteld op basis van de ingelogde gebruiker
    aanvraag_date: date = None
    status: str = "requested"  # Mogelijke waarden: "requested", "approved", "rejected"
    # Add additional fields
    shift_date: Optional[datetime] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        orm_mode = True


@router.get("/", response_model=List[Dienstaanvraag])
async def get_dienstaanvragen(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Haal dienstaanvragen op.
    - Medewerkers zien alleen hun eigen aanvragen.
    - Planners en admins zien alle aanvragen.
    """
    if any(role.name in ["planner", "admin"] for role in current_user.roles):
        requests = db.query(DBDienstAanvraag).all()
    else:
        requests = db.query(DBDienstAanvraag).filter(DBDienstAanvraag.employee_id == current_user.username).all()
    
    # Enhance the requests with shift details
    enhanced_requests = []
    for request in requests:
        # Get the associated shift
        shift = db.query(DBShift).filter(DBShift.id == request.shift_id).first()
        
        # Create a dictionary with the request data
        request_dict = {
            "id": request.id,
            "shift_id": request.shift_id,
            "employee_id": request.employee_id,
            "aanvraag_date": request.aanvraag_date,
            "status": request.status,
            "notes": None  # Add notes field if needed
        }
        
        # Add shift details if available
        if shift:
            request_dict.update({
                "shift_date": shift.datum,
                "start_time": shift.start_tijd,
                "end_time": shift.eind_tijd,
                "location": shift.locatie
            })
        
        enhanced_requests.append(request_dict)
    
    return enhanced_requests


@router.get("/my-requests", response_model=List[Dienstaanvraag])
async def get_my_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get service requests for the current user.
    Only employees can access this endpoint.
    """
    if not any(role.name == "employee" for role in current_user.roles):
        raise HTTPException(status_code=403, detail="Only employees can view their own requests")
    
    # Get the requests
    requests = db.query(DBDienstAanvraag).filter(DBDienstAanvraag.employee_id == current_user.username).all()
    
    # Enhance the requests with shift details
    enhanced_requests = []
    for request in requests:
        # Get the associated shift
        shift = db.query(DBShift).filter(DBShift.id == request.shift_id).first()
        
        # Create a dictionary with the request data
        request_dict = {
            "id": request.id,
            "shift_id": request.shift_id,
            "employee_id": request.employee_id,
            "aanvraag_date": request.aanvraag_date,
            "status": request.status,
            "notes": None  # Add notes field if needed
        }
        
        # Add shift details if available
        if shift:
            request_dict.update({
                "shift_date": shift.datum,
                "start_time": shift.start_tijd,
                "end_time": shift.eind_tijd,
                "location": shift.locatie
            })
        
        enhanced_requests.append(request_dict)
    
    return enhanced_requests


@router.get("/my-requests/{request_id}", response_model=Dienstaanvraag)
async def get_my_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a specific service request for the current user.
    Only employees can access this endpoint.
    """
    if not any(role.name == "employee" for role in current_user.roles):
        raise HTTPException(status_code=403, detail="Only employees can view their own requests")
    
    request = db.query(DBDienstAanvraag).filter(
        DBDienstAanvraag.id == request_id,
        DBDienstAanvraag.employee_id == current_user.username
    ).first()
    
    if not request:
        raise HTTPException(status_code=404, detail="Request not found or not assigned to you")
    
    # Get the associated shift
    shift = db.query(DBShift).filter(DBShift.id == request.shift_id).first()
    
    # Create a dictionary with the request data
    request_dict = {
        "id": request.id,
        "shift_id": request.shift_id,
        "employee_id": request.employee_id,
        "aanvraag_date": request.aanvraag_date,
        "status": request.status,
        "notes": None  # Add notes field if needed
    }
    
    # Add shift details if available
    if shift:
        request_dict.update({
            "shift_date": shift.datum,
            "start_time": shift.start_tijd,
            "end_time": shift.eind_tijd,
            "location": shift.locatie
        })
    
    return request_dict


@router.post("/", response_model=Dienstaanvraag, status_code=201)
async def create_dienstaanvraag(
    aanvraag: Dienstaanvraag,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Medewerkers dienen een dienstaanvraag in voor een specifieke shift.
    Het veld employee_id wordt overschreven met de ingelogde gebruiker en de aanvraag_date wordt op vandaag gezet.
    Na succesvolle indiening wordt er een e-mail gestuurd naar de medewerker ter bevestiging van de inschrijving.
    """
    if not any(role.name == "employee" for role in current_user.roles):
        raise HTTPException(status_code=403, detail="Only employees can submit service requests")
    
    # Check if the shift exists and is open
    shift = db.query(DBShift).filter(DBShift.id == aanvraag.shift_id).first()
    if not shift:
        raise HTTPException(status_code=404, detail="Shift not found")
    if shift.status not in ["open", "pending"]:
        raise HTTPException(status_code=400, detail="Shift is not open for requests")
    
    # Check if employee already has an active request for this shift
    existing_request = db.query(DBDienstAanvraag).filter(
        DBDienstAanvraag.shift_id == aanvraag.shift_id,
        DBDienstAanvraag.employee_id == current_user.username,
        DBDienstAanvraag.status == "requested"  # Only check for active requests
    ).first()
    if existing_request:
        raise HTTPException(status_code=400, detail="You already have an active request for this shift")
    
    # Get the opdrachtgever_id from the shift's location
    opdrachtgever = db.query(Opdrachtgever).filter(
        Opdrachtgever.naam == shift.locatie
    ).first()
    if not opdrachtgever:
        raise HTTPException(status_code=400, detail="Could not find opdrachtgever for this shift location")
    
    # Create new request
    db_aanvraag = DBDienstAanvraag(
        shift_id=aanvraag.shift_id,
        employee_id=current_user.username,
        aanvraag_date=datetime.utcnow().date(),
        status="requested",
        opdrachtgever_id=opdrachtgever.id
    )
    db.add(db_aanvraag)
    db.commit()
    db.refresh(db_aanvraag)

    # Send confirmation email
    if shift:
        employee_email = current_user.email
        send_shift_registration_email(employee_email, shift)

    return db_aanvraag


@router.post("/{aanvraag_id}/approve", response_model=Dienstaanvraag)
async def approve_dienstaanvraag(
    aanvraag_id: int,
    current_user: User = Depends(require_roles(["planner", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Planners of admins kunnen een dienstaanvraag goedkeuren.
    """
    aanvraag = db.query(DBDienstAanvraag).filter(DBDienstAanvraag.id == aanvraag_id).first()
    if not aanvraag:
        raise HTTPException(status_code=404, detail="Dienstaanvraag niet gevonden")
    
    aanvraag.status = "approved"
    db.commit()
    db.refresh(aanvraag)
    return aanvraag


@router.post("/{aanvraag_id}/reject", response_model=Dienstaanvraag)
async def reject_dienstaanvraag(
    aanvraag_id: int,
    current_user: User = Depends(require_roles(["planner", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Planners of admins kunnen een dienstaanvraag afwijzen.
    """
    aanvraag = db.query(DBDienstAanvraag).filter(DBDienstAanvraag.id == aanvraag_id).first()
    if not aanvraag:
        raise HTTPException(status_code=404, detail="Dienstaanvraag niet gevonden")
    
    aanvraag.status = "rejected"
    db.commit()
    db.refresh(aanvraag)
    return aanvraag


@router.delete("/{aanvraag_id}", response_model=Dienstaanvraag)
async def delete_dienstaanvraag(
    aanvraag_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Een medewerker kan zijn eigen dienstaanvraag intrekken, mits deze nog in de status 'requested' is.
    Planners of admins kunnen elke aanvraag verwijderen.
    Na uitschrijving wordt er een e-mail verstuurd naar de medewerker.
    """
    aanvraag = db.query(DBDienstAanvraag).filter(DBDienstAanvraag.id == aanvraag_id).first()
    if not aanvraag:
        raise HTTPException(status_code=404, detail="Dienstaanvraag niet gevonden")
    
    if not any(role.name in ["planner", "admin"] for role in current_user.roles):
        if aanvraag.employee_id != current_user.username or aanvraag.status != "requested":
            raise HTTPException(status_code=403, detail="Je kunt deze aanvraag niet verwijderen.")

    # Get shift details before deleting the request
    shift = db.query(DBShift).filter(DBShift.id == aanvraag.shift_id).first()
    
    # Delete the request
    db.delete(aanvraag)
    db.commit()

    if shift:
        employee_email = current_user.email
        send_shift_unregistration_email(employee_email, shift)

    return aanvraag
