from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime, time, date
from sqlalchemy.orm import Session
from database import get_db
from models import Shift, ShiftHourIncreaseRequest, User, Factuur, LocationRate
from auth import get_current_user, require_roles
import logging

router = APIRouter(
    prefix="/hour-increase",
    tags=["hour-increase"]
)

logger = logging.getLogger(__name__)

class HourIncreaseRequest(BaseModel):
    shift_id: int
    requested_end_time: str
    notes: Optional[str] = None

class HourIncreaseResponse(BaseModel):
    id: int
    shift_id: int
    employee_id: str
    requested_end_time: str
    original_end_time: str
    status: str
    request_date: datetime
    response_date: Optional[datetime]
    notes: Optional[str]

    class Config:
        orm_mode = True

@router.post("/request", response_model=HourIncreaseResponse)
async def request_hour_increase(
    request: HourIncreaseRequest,
    current_user: User = Depends(require_roles(["employee"])),
    db: Session = Depends(get_db)
):
    """Request an increase in working hours for a shift."""
    try:
        # Get the shift
        shift = db.query(Shift).filter(Shift.id == request.shift_id).first()
        if not shift:
            raise HTTPException(status_code=404, detail="Shift not found")

        # Check if the shift is assigned to the requesting employee
        if shift.medewerker_id != current_user.username:
            raise HTTPException(status_code=403, detail="You can only request hour increases for your own shifts")

        # Check if the shift is approved
        if shift.status != "approved":
            raise HTTPException(status_code=400, detail="Can only request hour increases for approved shifts")

        # Check if there's already a pending request
        existing_request = db.query(ShiftHourIncreaseRequest).filter(
            ShiftHourIncreaseRequest.shift_id == request.shift_id,
            ShiftHourIncreaseRequest.status == "pending"
        ).first()
        if existing_request:
            raise HTTPException(status_code=400, detail="There is already a pending request for this shift")

        # Validate the requested end time
        try:
            requested_time = datetime.strptime(request.requested_end_time, "%H:%M").time()
            original_time = datetime.strptime(shift.eind_tijd, "%H:%M").time()
            if requested_time <= original_time:
                raise HTTPException(status_code=400, detail="Requested end time must be later than the original end time")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid time format. Use HH:MM format")

        # Create the request
        hour_increase_request = ShiftHourIncreaseRequest(
            shift_id=request.shift_id,
            employee_id=current_user.username,
            requested_end_time=request.requested_end_time,
            original_end_time=shift.eind_tijd,
            notes=request.notes
        )

        db.add(hour_increase_request)
        db.commit()
        db.refresh(hour_increase_request)

        return hour_increase_request

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating hour increase request: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/requests", response_model=List[HourIncreaseResponse])
async def get_hour_increase_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all hour increase requests."""
    try:
        logger.info("Starting get_hour_increase_requests")
        logger.info(f"Current user: {current_user.username}")
        logger.info(f"User roles: {[role.name for role in current_user.roles]}")

        # Get all requests first
        try:
            all_requests = db.query(ShiftHourIncreaseRequest).all()
            logger.info(f"Total requests found: {len(all_requests)}")
            for req in all_requests:
                logger.info(f"Request: id={req.id}, employee={req.employee_id}, status={req.status}")
        except Exception as db_error:
            logger.error(f"Database error: {str(db_error)}")
            logger.error(f"Error type: {type(db_error)}")
            raise

        # Filter based on user role
        user_roles = [role.name for role in current_user.roles]
        if "admin" in user_roles or "planner" in user_roles:
            # Admins and planners can see all requests
            logger.info("User is admin/planner, returning all requests")
            return all_requests
        else:
            # Employees can only see their own requests
            logger.info(f"User is employee, filtering requests for {current_user.username}")
            filtered_requests = [
                req for req in all_requests 
                if req.employee_id == current_user.username
            ]
            logger.info(f"Filtered requests count: {len(filtered_requests)}")
            return filtered_requests

    except Exception as e:
        logger.error(f"Error in get_hour_increase_requests: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error details: {e.__dict__ if hasattr(e, '__dict__') else 'No details available'}")
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching hour increase requests: {str(e)}"
        )

@router.post("/{request_id}/approve", response_model=HourIncreaseResponse)
async def approve_hour_increase(
    request_id: int,
    current_user: User = Depends(require_roles(["admin", "planner"])),
    db: Session = Depends(get_db)
):
    """Approve an hour increase request."""
    try:
        # Get the request
        hour_request = db.query(ShiftHourIncreaseRequest).filter(
            ShiftHourIncreaseRequest.id == request_id
        ).first()
        if not hour_request:
            raise HTTPException(status_code=404, detail="Hour increase request not found")

        if hour_request.status != "pending":
            raise HTTPException(status_code=400, detail="Can only approve pending requests")

        # Update the shift's end time
        shift = db.query(Shift).filter(Shift.id == hour_request.shift_id).first()
        if not shift:
            raise HTTPException(status_code=404, detail="Shift not found")

        # Calculate the additional hours
        original_time = datetime.strptime(hour_request.original_end_time, "%H:%M").time()
        new_time = datetime.strptime(hour_request.requested_end_time, "%H:%M").time()
        additional_hours = (
            datetime.combine(date.today(), new_time) - 
            datetime.combine(date.today(), original_time)
        ).total_seconds() / 3600

        # Update the shift
        shift.eind_tijd = hour_request.requested_end_time
        hour_request.status = "approved"
        hour_request.response_date = datetime.utcnow()

        # If the shift is linked to an invoice, update it
        if shift.factuur_id:
            factuur = db.query(Factuur).filter(Factuur.id == shift.factuur_id).first()
            if factuur:
                # Get the location rate for this shift
                location_rate = db.query(LocationRate).filter(
                    LocationRate.location_id == shift.location_id,
                    LocationRate.pas_type == shift.required_profile
                ).first()

                if location_rate:
                    # Calculate additional amount based on the rate
                    additional_amount = additional_hours * location_rate.base_rate

                    # Update invoice amounts
                    factuur.bedrag = (factuur.bedrag or 0) + additional_amount
                    factuur.subtotal = factuur.bedrag
                    factuur.vat_amount = factuur.subtotal * 0.21  # 21% VAT
                    factuur.total_amount = factuur.subtotal + factuur.vat_amount

                    # Update the breakdown in the invoice
                    if factuur.breakdown:
                        breakdown = factuur.breakdown
                    else:
                        breakdown = {}

                    # Add the additional hours to the breakdown
                    shift_key = f"shift_{shift.id}"
                    if shift_key in breakdown:
                        breakdown[shift_key]["hours"] += additional_hours
                        breakdown[shift_key]["amount"] += additional_amount
                    else:
                        breakdown[shift_key] = {
                            "hours": additional_hours,
                            "amount": additional_amount,
                            "rate": location_rate.base_rate
                        }

                    factuur.breakdown = breakdown

                    # Update the factuur_text to reflect the new end time
                    if factuur.factuur_text:
                        lines = factuur.factuur_text.split('\n')
                        for i, line in enumerate(lines):
                            if f"shift_{shift.id}" in line:
                                # Update the line with the new end time
                                parts = line.split()
                                if len(parts) >= 7:
                                    parts[0] = f"{float(parts[0]) + additional_hours:.1f}"
                                    parts[6] = f"€{float(parts[6].replace('€', '')) + additional_amount:.2f}"
                                    lines[i] = ' '.join(parts)
                        factuur.factuur_text = '\n'.join(lines)

        db.commit()
        db.refresh(hour_request)
        return hour_request

    except Exception as e:
        db.rollback()
        logger.error(f"Error approving hour increase request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{request_id}/reject", response_model=HourIncreaseResponse)
async def reject_hour_increase(
    request_id: int,
    current_user: User = Depends(require_roles(["admin", "planner"])),
    db: Session = Depends(get_db)
):
    """Reject an hour increase request."""
    try:
        # Get the request
        hour_request = db.query(ShiftHourIncreaseRequest).filter(
            ShiftHourIncreaseRequest.id == request_id
        ).first()
        if not hour_request:
            raise HTTPException(status_code=404, detail="Hour increase request not found")

        if hour_request.status != "pending":
            raise HTTPException(status_code=400, detail="Can only reject pending requests")

        # Update the request status
        hour_request.status = "rejected"
        hour_request.response_date = datetime.utcnow()

        db.commit()
        db.refresh(hour_request)
        return hour_request

    except Exception as e:
        db.rollback()
        logger.error(f"Error rejecting hour increase request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 