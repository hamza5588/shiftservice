from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Medewerker
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from auth import get_current_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/medewerkers",
    tags=["medewerkers"]
)

class MedewerkerBase(BaseModel):
    naam: str
    email: str
    telefoon: Optional[str] = None
    adres: Optional[str] = None
    geboortedatum: Optional[datetime] = None
    in_dienst: Optional[datetime] = None
    uit_dienst: Optional[datetime] = None
    pas_type: Optional[str] = None
    pas_nummer: Optional[str] = None
    pas_vervaldatum: Optional[datetime] = None
    pas_foto: Optional[str] = None
    contract_type: Optional[str] = None
    contract_uren: Optional[int] = None
    contract_vervaldatum: Optional[datetime] = None
    contract_bestand: Optional[str] = None

class MedewerkerUpdate(MedewerkerBase):
    pass

class MedewerkerResponse(MedewerkerBase):
    id: int

    class Config:
        from_attributes = True
        orm_mode = True

    @classmethod
    def from_orm(cls, obj):
        logger.debug(f"Converting Medewerker to response: {obj.__dict__}")
        return cls(**obj.__dict__)

@router.get("/", response_model=List[MedewerkerResponse])
async def get_medewerkers(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all employees."""
    try:
        logger.debug("Fetching all employees")
        medewerkers = db.query(Medewerker).all()
        logger.debug(f"Found {len(medewerkers)} employees")
        for medewerker in medewerkers:
            logger.debug(f"Employee: {medewerker.naam}, {medewerker.email}")
        return [MedewerkerResponse.from_orm(medewerker) for medewerker in medewerkers]
    except Exception as e:
        logger.error(f"Error fetching employees: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{medewerker_id}", response_model=MedewerkerResponse)
async def get_medewerker(
    medewerker_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific employee by ID."""
    try:
        medewerker = db.query(Medewerker).filter(Medewerker.id == medewerker_id).first()
        if not medewerker:
            raise HTTPException(status_code=404, detail="Employee not found")
        return medewerker
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{medewerker_id}", response_model=MedewerkerResponse)
async def update_medewerker(
    medewerker_id: int,
    medewerker_update: MedewerkerUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update an employee profile."""
    try:
        # Check if user has admin role
        if not hasattr(current_user, 'roles'):
            raise HTTPException(status_code=403, detail="User roles not found")
            
        user_roles = [role.name for role in current_user.roles]
        if "admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Only admin users can update employee profiles")
        
        # Get the employee
        db_medewerker = db.query(Medewerker).filter(Medewerker.id == medewerker_id).first()
        if not db_medewerker:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Update employee fields
        for key, value in medewerker_update.dict(exclude_unset=True).items():
            setattr(db_medewerker, key, value)
        
        db.commit()
        db.refresh(db_medewerker)
        
        return db_medewerker
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{medewerker_id}")
async def delete_medewerker(
    medewerker_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete an employee by ID."""
    try:
        # Check if user has admin role
        if not hasattr(current_user, 'roles'):
            raise HTTPException(status_code=403, detail="User roles not found")
            
        user_roles = [role.name for role in current_user.roles]
        if "admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Only admin users can delete employees")
        
        # Get the employee
        medewerker = db.query(Medewerker).filter(Medewerker.id == medewerker_id).first()
        if not medewerker:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Delete the employee
        db.delete(medewerker)
        db.commit()
        
        return {"message": "Employee deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) 