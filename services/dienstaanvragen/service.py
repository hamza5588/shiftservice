from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..auth import get_current_user, require_roles
from . import models, schemas

router = APIRouter(prefix="/dienstaanvragen", tags=["dienstaanvragen"])

@router.get("/", response_model=List[schemas.DienstaanvraagResponse])
async def get_dienstaanvragen(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all service requests."""
    if hasattr(current_user, 'roles') and any(role.name in ["admin", "planner"] for role in current_user.roles):
        return db.query(models.Dienstaanvraag).all()
    else:
        return db.query(models.Dienstaanvraag).filter(
            models.Dienstaanvraag.medewerker_id == current_user.username
        ).all()

@router.post("/", response_model=schemas.DienstaanvraagResponse)
async def create_dienstaanvraag(
    aanvraag: schemas.DienstaanvraagCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new service request."""
    db_aanvraag = models.Dienstaanvraag(
        medewerker_id=current_user["username"],
        **aanvraag.dict()
    )
    db.add(db_aanvraag)
    db.commit()
    db.refresh(db_aanvraag)
    return db_aanvraag

@router.get("/{aanvraag_id}", response_model=schemas.DienstaanvraagResponse)
async def get_dienstaanvraag(
    aanvraag_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific service request."""
    aanvraag = db.query(models.Dienstaanvraag).filter(
        models.Dienstaanvraag.id == aanvraag_id
    ).first()
    
    if not aanvraag:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    if current_user["role"] not in ["admin", "planner"] and \
       aanvraag.medewerker_id != current_user["username"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this request")
    
    return aanvraag

@router.post("/{aanvraag_id}/approve")
@require_roles(["admin", "planner"])
async def approve_dienstaanvraag(
    aanvraag_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Approve a service request."""
    aanvraag = db.query(models.Dienstaanvraag).filter(
        models.Dienstaanvraag.id == aanvraag_id
    ).first()
    
    if not aanvraag:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    if aanvraag.status != "open":
        raise HTTPException(status_code=400, detail="Request is not open for approval")
    
    aanvraag.status = "approved"
    db.commit()
    return {"message": "Request approved successfully"}

@router.post("/{aanvraag_id}/reject")
@require_roles(["admin", "planner"])
async def reject_dienstaanvraag(
    aanvraag_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Reject a service request."""
    aanvraag = db.query(models.Dienstaanvraag).filter(
        models.Dienstaanvraag.id == aanvraag_id
    ).first()
    
    if not aanvraag:
        raise HTTPException(status_code=404, detail="Service request not found")
    
    if aanvraag.status != "open":
        raise HTTPException(status_code=400, detail="Request is not open for rejection")
    
    aanvraag.status = "rejected"
    db.commit()
    return {"message": "Request rejected successfully"} 