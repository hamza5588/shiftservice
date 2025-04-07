from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..auth import get_current_user, require_roles
from . import models, schemas

router = APIRouter(prefix="/employee-profiles", tags=["employee-profiles"])

@router.get("/", response_model=List[schemas.EmployeeProfileResponse])
@require_roles(["admin", "boekhouding"])
async def get_employee_profiles(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all employee profiles."""
    return db.query(models.EmployeeProfile).all()

@router.post("/", response_model=schemas.EmployeeProfileResponse)
@require_roles(["admin", "boekhouding"])
async def create_employee_profile(
    profile: schemas.EmployeeProfileCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new employee profile."""
    # Check if profile already exists
    existing_profile = db.query(models.EmployeeProfile).filter(
        models.EmployeeProfile.medewerker_id == profile.medewerker_id
    ).first()
    
    if existing_profile:
        raise HTTPException(
            status_code=400,
            detail="Profile already exists for this employee"
        )
    
    db_profile = models.EmployeeProfile(**profile.dict())
    db.add(db_profile)
    db.commit()
    db.refresh(db_profile)
    return db_profile

@router.get("/{medewerker_id}", response_model=schemas.EmployeeProfileResponse)
@require_roles(["admin", "boekhouding"])
async def get_employee_profile(
    medewerker_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific employee profile."""
    profile = db.query(models.EmployeeProfile).filter(
        models.EmployeeProfile.medewerker_id == medewerker_id
    ).first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    return profile

@router.put("/{medewerker_id}", response_model=schemas.EmployeeProfileResponse)
@require_roles(["admin", "boekhouding"])
async def update_employee_profile(
    medewerker_id: str,
    profile_update: schemas.EmployeeProfileUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update an employee profile."""
    db_profile = db.query(models.EmployeeProfile).filter(
        models.EmployeeProfile.medewerker_id == medewerker_id
    ).first()
    
    if not db_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    for field, value in profile_update.dict(exclude_unset=True).items():
        setattr(db_profile, field, value)
    
    db.commit()
    db.refresh(db_profile)
    return db_profile

@router.delete("/{medewerker_id}")
@require_roles(["admin", "boekhouding"])
async def delete_employee_profile(
    medewerker_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete an employee profile."""
    db_profile = db.query(models.EmployeeProfile).filter(
        models.EmployeeProfile.medewerker_id == medewerker_id
    ).first()
    
    if not db_profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    db.delete(db_profile)
    db.commit()
    return {"message": "Profile deleted successfully"} 