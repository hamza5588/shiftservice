from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Medewerker, User
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

class EmployeeResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    roles: List[str]
    personeelsnummer: int
    uurloner: bool
    telefoonvergoeding_per_uur: float
    maaltijdvergoeding_per_uur: float
    de_minimis_bonus_per_uur: float
    wkr_toeslag_per_uur: float
    kilometervergoeding: float
    max_km: int
    hourly_allowance: float
    naam: str
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

    class Config:
        from_attributes = True

@router.get("/", response_model=List[EmployeeResponse])
async def get_medewerkers(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all employees."""
    try:
        logger.debug("Fetching all employees")
        # Get all medewerkers with their associated users
        medewerkers = db.query(Medewerker).options(
            joinedload(Medewerker.user)
        ).all()
        logger.debug(f"Found {len(medewerkers)} employees")
        
        # Convert to the expected format
        result = []
        for medewerker in medewerkers:
            try:
                if not medewerker.user:
                    logger.warning(f"No user found for medewerker {medewerker.id}")
                    continue
                    
                employee_data = EmployeeResponse(
                    id=medewerker.id,
                    username=medewerker.user.username,
                    email=medewerker.email,
                    full_name=medewerker.naam,
                    roles=[role.name for role in medewerker.user.roles],
                    personeelsnummer=medewerker.id,
                    uurloner=medewerker.contract_type == "Uurloner",
                    telefoonvergoeding_per_uur=2.0,
                    maaltijdvergoeding_per_uur=1.5,
                    de_minimis_bonus_per_uur=0.5,
                    wkr_toeslag_per_uur=1.0,
                    kilometervergoeding=0.23,
                    max_km=60,
                    hourly_allowance=15.0,
                    naam=medewerker.naam,
                    telefoon=medewerker.telefoon,
                    adres=medewerker.adres,
                    geboortedatum=medewerker.geboortedatum,
                    in_dienst=medewerker.in_dienst,
                    uit_dienst=medewerker.uit_dienst,
                    pas_type=medewerker.pas_type,
                    pas_nummer=medewerker.pas_nummer,
                    pas_vervaldatum=medewerker.pas_vervaldatum,
                    pas_foto=medewerker.pas_foto,
                    contract_type=medewerker.contract_type,
                    contract_uren=medewerker.contract_uren,
                    contract_vervaldatum=medewerker.contract_vervaldatum,
                    contract_bestand=medewerker.contract_bestand
                )
                result.append(employee_data)
                logger.debug(f"Employee: {medewerker.naam}, {medewerker.email}")
            except Exception as e:
                logger.error(f"Error processing medewerker {medewerker.id}: {str(e)}")
                continue
        
        return result
    except Exception as e:
        logger.error(f"Error fetching employees: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error details: {e.__dict__ if hasattr(e, '__dict__') else 'No details available'}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{medewerker_id}", response_model=EmployeeResponse)
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

@router.put("/{medewerker_id}", response_model=EmployeeResponse)
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