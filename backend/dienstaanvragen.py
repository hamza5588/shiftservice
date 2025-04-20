from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, date
from auth import get_current_user, require_roles
from database import get_db
from sqlalchemy.orm import Session
from models import User, Shift as DBShift, Dienstaanvraag as DBDienstaanvraag, Opdrachtgever, Location
from email_utils import send_shift_registration_email, send_shift_unregistration_email
from auto_approval import check_auto_approval_eligibility
import logging

router = APIRouter(
    prefix="/dienstaanvragen",
    tags=["dienstaanvragen"]
)

logger = logging.getLogger(__name__)


class Dienstaanvraag(BaseModel):
    id: int
    shift_id: Optional[int] = None
    employee_id: str
    aanvraag_date: str
    status: str  # 'requested' | 'approved' | 'rejected' | 'open'
    shift_date: Optional[str] = None
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
    try:
        # Safely check user roles
        user_roles = [role.name for role in current_user.roles] if hasattr(current_user, 'roles') else []
        logger.info(f"User roles: {user_roles}")
        
        if any(role in ["planner", "admin"] for role in user_roles):
            requests = db.query(DBDienstaanvraag).all()
        else:
            requests = db.query(DBDienstaanvraag).filter(DBDienstaanvraag.employee_id == current_user.username).all()
        
        # Enhance the requests with shift details
        enhanced_requests = []
        for request in requests:
            try:
                # Get the associated shift
                shift = db.query(DBShift).filter(DBShift.id == request.shift_id).first()
                
                # Format the aanvraag_date as a string
                aanvraag_date_str = request.aanvraag_date.isoformat() if request.aanvraag_date else None
                
                # Create a dictionary with the request data
                request_dict = {
                    "id": request.id,
                    "shift_id": request.shift_id,
                    "employee_id": request.employee_id,
                    "aanvraag_date": aanvraag_date_str,
                    "status": request.status,
                    "notes": request.notes,
                    "shift_date": shift.datum.isoformat() if shift and shift.datum else None,
                    "start_time": shift.start_tijd if shift else None,
                    "end_time": shift.eind_tijd if shift else None,
                    "location": shift.locatie if shift else None
                }
                
                enhanced_requests.append(request_dict)
            except Exception as e:
                logger.error(f"Error processing request {request.id}: {str(e)}")
                continue
        
        return enhanced_requests
    except Exception as e:
        logger.error(f"Error in get_dienstaanvragen: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.get("/my-requests", response_model=List[Dienstaanvraag])
async def get_my_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all shift requests for the current user.
    Only employees can access this endpoint.
    """
    try:
        if not any(role.name == "employee" for role in current_user.roles):
            raise HTTPException(status_code=403, detail="Only employees can view their requests")
        
        # Get all requests for the current user
        requests = db.query(DBDienstaanvraag).filter(
            DBDienstaanvraag.employee_id == current_user.username
        ).all()
        
        # Convert requests to Dienstaanvraag format
        my_requests = []
        for request in requests:
            try:
                # Get the associated shift
                shift = db.query(DBShift).filter(DBShift.id == request.shift_id).first()
                if not shift:
                    continue
                
                # Format the aanvraag_date as a string
                aanvraag_date_str = request.aanvraag_date.isoformat() if request.aanvraag_date else None
                
                request_dict = {
                    "id": request.id,
                    "shift_id": request.shift_id,
                    "employee_id": request.employee_id,
                    "aanvraag_date": aanvraag_date_str,
                    "status": request.status,
                    "shift_date": shift.datum.isoformat() if shift.datum else None,
                    "start_time": shift.start_tijd,
                    "end_time": shift.eind_tijd,
                    "location": shift.locatie,
                    "notes": request.notes
                }
                my_requests.append(request_dict)
            except Exception as e:
                logger.error(f"Error processing request {request.id}: {str(e)}")
                continue
        
        return my_requests
    except Exception as e:
        logger.error(f"Error in get_my_requests: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


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
    
    request = db.query(DBDienstaanvraag).filter(
        DBDienstaanvraag.id == request_id,
        DBDienstaanvraag.employee_id == current_user.username
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
            "shift_date": shift.datum.isoformat() if shift.datum else None,  # Format date as ISO string
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
    try:
        logger.info(f"Creating service request for shift {aanvraag.shift_id} by user {current_user.username}")
        
        if not any(role.name == "employee" for role in current_user.roles):
            raise HTTPException(status_code=403, detail="Only employees can submit service requests")
        
        # Check if the shift exists and is open
        shift = db.query(DBShift).filter(DBShift.id == aanvraag.shift_id).first()
        if not shift:
            raise HTTPException(status_code=404, detail="Shift not found")
        
        logger.info(f"Found shift: {shift.id} with location_id: {shift.location_id}")
        
        # Get the location and opdrachtgever_id
        location = db.query(Location).filter(Location.id == shift.location_id).first()
        if not location:
            raise HTTPException(status_code=404, detail="Location not found")
        
        logger.info(f"Found location: {location.id} with opdrachtgever_id: {location.opdrachtgever_id}")
        
        if not location.opdrachtgever_id:
            raise HTTPException(status_code=400, detail="Location has no associated opdrachtgever")
        
        # Only allow requests for open shifts
        if shift.status != "open":
            raise HTTPException(status_code=400, detail="Shift is not open for requests")
        
        # Check if employee already has an active request for this shift
        existing_request = db.query(DBDienstaanvraag).filter(
            DBDienstaanvraag.shift_id == aanvraag.shift_id,
            DBDienstaanvraag.employee_id == current_user.username,
            DBDienstaanvraag.status.in_(["requested", "approved"])  # Check for both requested and approved
        ).first()
        if existing_request:
            raise HTTPException(status_code=400, detail="You already have an active request for this shift")
        
        # Check if the request should be auto-approved
        should_auto_approve = check_auto_approval_eligibility(
            db=db,
            employee_id=current_user.username,
            location=shift.locatie,
            shift_id=shift.id
        )
        
        logger.info(f"Auto-approval check result: {should_auto_approve}")
        
        # Create new request with opdrachtgever_id
        db_aanvraag = DBDienstaanvraag(
            shift_id=aanvraag.shift_id,
            employee_id=current_user.username,
            aanvraag_date=datetime.utcnow().date(),
            status="approved" if should_auto_approve else "requested",
            notes=aanvraag.notes,
            opdrachtgever_id=location.opdrachtgever_id
        )
        
        logger.info(f"Creating service request with data: {db_aanvraag.__dict__}")
        
        db.add(db_aanvraag)
        
        # If auto-approved, update the shift status
        if should_auto_approve:
            shift.status = "assigned"
            shift.medewerker_id = current_user.username
        
        try:
            db.commit()
            db.refresh(db_aanvraag)
            logger.info(f"Successfully created service request: {db_aanvraag.id}")
        except Exception as e:
            logger.error(f"Database error while creating service request: {str(e)}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

        # Send confirmation email
        if shift:
            try:
                employee_email = current_user.email
                shift_dict = {
                    'shift_date': shift.datum,
                    'location': shift.locatie,
                    'titel': shift.titel,
                    'start_time': shift.start_tijd,
                    'end_time': shift.eind_tijd,
                    'status': 'approved' if should_auto_approve else 'requested'
                }
                send_shift_registration_email(employee_email, shift_dict)
            except Exception as e:
                # Log the error but don't fail the request
                logger.error(f"Failed to send confirmation email: {str(e)}")

        # Format the response to match the Dienstaanvraag model
        response_dict = {
            "id": db_aanvraag.id,
            "shift_id": db_aanvraag.shift_id,
            "employee_id": db_aanvraag.employee_id,
            "aanvraag_date": db_aanvraag.aanvraag_date.isoformat() if db_aanvraag.aanvraag_date else None,
            "status": db_aanvraag.status,
            "notes": db_aanvraag.notes,
            "shift_date": shift.datum.isoformat() if shift and shift.datum else None,
            "start_time": shift.start_tijd if shift else None,
            "end_time": shift.eind_tijd if shift else None,
            "location": shift.locatie if shift else None
        }
        
        return response_dict
    except HTTPException as he:
        logger.error(f"HTTP error in create_dienstaanvraag: {str(he)}")
        raise he
    except Exception as e:
        logger.error(f"Unexpected error in create_dienstaanvraag: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{aanvraag_id}/approve", response_model=Dienstaanvraag)
async def approve_dienstaanvraag(
    aanvraag_id: int,
    current_user: User = Depends(require_roles(["planner", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Approve a shift request and update the associated shift.
    Only planners and admins can approve requests.
    """
    try:
        # Get the request
        aanvraag = db.query(DBDienstaanvraag).filter(DBDienstaanvraag.id == aanvraag_id).first()
        if not aanvraag:
            raise HTTPException(status_code=404, detail="Dienstaanvraag niet gevonden")
        
        if aanvraag.status != "requested":
            raise HTTPException(status_code=400, detail="Can only approve requests in 'requested' status")
        
        # Get the associated shift
        shift = db.query(DBShift).filter(DBShift.id == aanvraag.shift_id).first()
        if not shift:
            raise HTTPException(status_code=404, detail="Associated shift not found")
        
        if shift.status != "open":
            raise HTTPException(status_code=400, detail="Shift is no longer open")
        
        # Update the request status
        aanvraag.status = "approved"
        
        # Update the shift
        shift.status = "approved"
        # Ensure employee_id is a string
        shift.medewerker_id = str(aanvraag.employee_id)
        
        # Reject any other pending requests for this shift
        other_requests = db.query(DBDienstaanvraag).filter(
            DBDienstaanvraag.shift_id == aanvraag.shift_id,
            DBDienstaanvraag.id != aanvraag_id,
            DBDienstaanvraag.status == "requested"
        ).all()
        
        for request in other_requests:
            request.status = "rejected"
        
        db.commit()
        db.refresh(aanvraag)
        
        # Format the response to match the Dienstaanvraag model
        response_dict = {
            "id": aanvraag.id,
            "shift_id": aanvraag.shift_id,
            "employee_id": aanvraag.employee_id,
            "aanvraag_date": aanvraag.aanvraag_date.isoformat() if aanvraag.aanvraag_date else None,
            "status": aanvraag.status,
            "notes": aanvraag.notes,
            "shift_date": shift.datum.isoformat() if shift and shift.datum else None,
            "start_time": shift.start_tijd if shift else None,
            "end_time": shift.eind_tijd if shift else None,
            "location": shift.locatie if shift else None
        }
        
        return response_dict
    except Exception as e:
        logger.error(f"Error in approve_dienstaanvraag: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/{aanvraag_id}/reject", response_model=Dienstaanvraag)
async def reject_dienstaanvraag(
    aanvraag_id: int,
    current_user: User = Depends(require_roles(["planner", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Reject a shift request.
    Only planners and admins can reject requests.
    """
    try:
        aanvraag = db.query(DBDienstaanvraag).filter(DBDienstaanvraag.id == aanvraag_id).first()
        if not aanvraag:
            raise HTTPException(status_code=404, detail="Dienstaanvraag niet gevonden")
        
        if aanvraag.status != "requested":
            raise HTTPException(status_code=400, detail="Can only reject requests in 'requested' status")
        
        # Get the associated shift
        shift = db.query(DBShift).filter(DBShift.id == aanvraag.shift_id).first()
        
        # Update the request status
        aanvraag.status = "rejected"
        db.commit()
        db.refresh(aanvraag)
        
        # Format the response to match the Dienstaanvraag model
        response_dict = {
            "id": aanvraag.id,
            "shift_id": aanvraag.shift_id,
            "employee_id": aanvraag.employee_id,
            "aanvraag_date": aanvraag.aanvraag_date.isoformat() if aanvraag.aanvraag_date else None,
            "status": aanvraag.status,
            "notes": aanvraag.notes,
            "shift_date": shift.datum.isoformat() if shift and shift.datum else None,
            "start_time": shift.start_tijd if shift else None,
            "end_time": shift.eind_tijd if shift else None,
            "location": shift.locatie if shift else None
        }
        
        return response_dict
    except Exception as e:
        logger.error(f"Error in reject_dienstaanvraag: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.delete("/{aanvraag_id}", response_model=Dienstaanvraag)
async def delete_dienstaanvraag(
    aanvraag_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a service request.
    Only the employee who created the request or an admin can delete it.
    """
    try:
        db_aanvraag = db.query(DBDienstaanvraag).filter(DBDienstaanvraag.id == aanvraag_id).first()
        if not db_aanvraag:
            raise HTTPException(status_code=404, detail="Service request not found")
        
        # Check if user is the owner of the request or an admin
        if db_aanvraag.employee_id != current_user.id and not any(role.name == "admin" for role in current_user.roles):
            raise HTTPException(status_code=403, detail="You don't have permission to delete this request")
        
        db.delete(db_aanvraag)
        db.commit()
        
        return db_aanvraag
    except Exception as e:
        logger.error(f"Error in delete_dienstaanvraag: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
