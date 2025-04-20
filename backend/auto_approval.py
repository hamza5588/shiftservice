from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from auth import require_roles
from database import get_db
from sqlalchemy.orm import Session
from models import AutoApproval, User, Shift, Location, AutoApprovalGlobalConfig, LocationAutoApprovalConfig
from datetime import datetime, timedelta

router = APIRouter(
    prefix="/auto_approval",
    tags=["auto_approval"]
)

class AutoApprovalSetting(BaseModel):
    id: Optional[int] = None
    employee_id: str
    location: str
    auto_approve: bool

    class Config:
        orm_mode = True

class GlobalConfig(BaseModel):
    enable_experience_based_approval: bool
    default_priority_window_hours: int

    class Config:
        orm_mode = True

class LocationConfig(BaseModel):
    location_id: int
    enable_experience_based_approval: bool
    priority_window_hours: Optional[int] = None

    class Config:
        orm_mode = True

@router.get("/", response_model=List[AutoApprovalSetting])
async def get_auto_approval_settings(
    employee_id: Optional[str] = Query(None),
    location: Optional[str] = Query(None),
    current_user: User = Depends(require_roles(["planner", "admin"])),
    db: Session = Depends(get_db)
):
    query = db.query(AutoApproval)
    if employee_id is not None:
        query = query.filter(AutoApproval.employee_id == employee_id)
    if location is not None:
        query = query.filter(AutoApproval.location == location)
    return query.all()

@router.get("/{setting_id}", response_model=AutoApprovalSetting)
async def get_auto_approval_setting(
    setting_id: int,
    current_user: User = Depends(require_roles(["planner", "admin"])),
    db: Session = Depends(get_db)
):
    setting = db.query(AutoApproval).filter(AutoApproval.id == setting_id).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    return setting

@router.post("/", response_model=AutoApprovalSetting, status_code=201)
async def create_auto_approval_setting(
    setting: AutoApprovalSetting,
    current_user: User = Depends(require_roles(["planner", "admin"])),
    db: Session = Depends(get_db)
):
    print(f"Creating auto-approval setting: {setting}")
    
    # Verify the employee exists - check both id and username
    employee = db.query(User).filter(
        (User.id == setting.employee_id) | (User.username == setting.employee_id)
    ).first()
    
    if not employee:
        # Try to find the employee to give a helpful message
        all_employees = db.query(User).all()
        print("Available employees:", [(e.id, e.username) for e in all_employees])
        raise HTTPException(
            status_code=404, 
            detail=f"Employee with ID {setting.employee_id} not found. Please use either the employee's ID or username."
        )
    
    # Use the employee's username for consistency
    setting.employee_id = employee.username
    
    # Verify the location exists
    location = db.query(Location).filter(Location.naam == setting.location).first()
    if not location:
        # List available locations for debugging
        all_locations = db.query(Location).all()
        print("Available locations:", [loc.naam for loc in all_locations])
        raise HTTPException(
            status_code=404, 
            detail=f"Location {setting.location} not found. Please check the location name."
        )
    
    # Check if setting already exists
    existing_setting = db.query(AutoApproval).filter(
        AutoApproval.employee_id == setting.employee_id,
        AutoApproval.location == setting.location
    ).first()
    
    if existing_setting:
        # Update existing setting
        existing_setting.auto_approve = setting.auto_approve
        db.commit()
        db.refresh(existing_setting)
        print(f"Updated existing auto-approval setting: {existing_setting.__dict__}")
        return existing_setting
    
    # Create new setting
    db_setting = AutoApproval(
        employee_id=setting.employee_id,
        location=setting.location,
        auto_approve=setting.auto_approve
    )
    db.add(db_setting)
    
    try:
        db.commit()
        db.refresh(db_setting)
        print(f"Created new auto-approval setting: {db_setting.__dict__}")
        return db_setting
    except Exception as e:
        db.rollback()
        print(f"Error creating auto-approval setting: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create auto-approval setting: {str(e)}")

@router.put("/{setting_id}", response_model=AutoApprovalSetting)
async def update_auto_approval_setting(
    setting_id: int,
    setting: AutoApprovalSetting,
    current_user: User = Depends(require_roles(["planner", "admin"])),
    db: Session = Depends(get_db)
):
    db_setting = db.query(AutoApproval).filter(AutoApproval.id == setting_id).first()
    if not db_setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    db_setting.employee_id = setting.employee_id
    db_setting.location = setting.location
    db_setting.auto_approve = setting.auto_approve
    
    db.commit()
    db.refresh(db_setting)
    return db_setting

@router.delete("/{setting_id}", response_model=AutoApprovalSetting)
async def delete_auto_approval_setting(
    setting_id: int,
    current_user: User = Depends(require_roles(["planner", "admin"])),
    db: Session = Depends(get_db)
):
    setting = db.query(AutoApproval).filter(AutoApproval.id == setting_id).first()
    if not setting:
        raise HTTPException(status_code=404, detail="Setting not found")
    
    db.delete(setting)
    db.commit()
    return setting

# Global Configuration Endpoints
@router.get("/global-config", response_model=GlobalConfig)
async def get_global_config(
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    config = db.query(AutoApprovalGlobalConfig).first()
    if not config:
        # Create default config if none exists
        config = AutoApprovalGlobalConfig()
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

@router.put("/global-config", response_model=GlobalConfig)
async def update_global_config(
    config: GlobalConfig,
    current_user: User = Depends(require_roles(["admin"])),
    db: Session = Depends(get_db)
):
    db_config = db.query(AutoApprovalGlobalConfig).first()
    if not db_config:
        db_config = AutoApprovalGlobalConfig()
        db.add(db_config)
    
    db_config.enable_experience_based_approval = config.enable_experience_based_approval
    db_config.default_priority_window_hours = config.default_priority_window_hours
    
    db.commit()
    db.refresh(db_config)
    return db_config

# Location Configuration Endpoints
@router.get("/location-config/{location_id}", response_model=LocationConfig)
async def get_location_config(
    location_id: int,
    current_user: User = Depends(require_roles(["admin", "planner"])),
    db: Session = Depends(get_db)
):
    config = db.query(LocationAutoApprovalConfig).filter(
        LocationAutoApprovalConfig.location_id == location_id
    ).first()
    if not config:
        # Create default config if none exists
        config = LocationAutoApprovalConfig(location_id=location_id)
        db.add(config)
        db.commit()
        db.refresh(config)
    return config

@router.put("/location-config/{location_id}", response_model=LocationConfig)
async def update_location_config(
    location_id: int,
    config: LocationConfig,
    current_user: User = Depends(require_roles(["admin", "planner"])),
    db: Session = Depends(get_db)
):
    db_config = db.query(LocationAutoApprovalConfig).filter(
        LocationAutoApprovalConfig.location_id == location_id
    ).first()
    if not db_config:
        db_config = LocationAutoApprovalConfig(location_id=location_id)
        db.add(db_config)
    
    db_config.enable_experience_based_approval = config.enable_experience_based_approval
    db_config.priority_window_hours = config.priority_window_hours
    
    db.commit()
    db.refresh(db_config)
    return db_config

def check_auto_approval_eligibility(
    db: Session,
    employee_id: str,
    location: str,
    shift_id: int
) -> bool:
    """
    Check if a shift request should be auto-approved based on:
    1. Per-employee, per-location auto-approval settings
    2. Location experience (if enabled)
    3. Priority for recently worked employees
    """
    # Get global configuration
    global_config = db.query(AutoApprovalGlobalConfig).first()
    if not global_config:
        global_config = AutoApprovalGlobalConfig()
        db.add(global_config)
        db.commit()
        db.refresh(global_config)

    # Get location configuration
    location_obj = db.query(Location).filter(Location.naam == location).first()
    if not location_obj:
        return False

    location_config = db.query(LocationAutoApprovalConfig).filter(
        LocationAutoApprovalConfig.location_id == location_obj.id
    ).first()
    if not location_config:
        location_config = LocationAutoApprovalConfig(location_id=location_obj.id)
        db.add(location_config)
        db.commit()
        db.refresh(location_config)

    # Check per-employee, per-location auto-approval setting
    auto_approval = db.query(AutoApproval).filter(
        AutoApproval.employee_id == employee_id,
        AutoApproval.location == location,
        AutoApproval.auto_approve == True
    ).first()
    
    if auto_approval:
        return True
    
    # Check if experience-based approval is enabled
    if (global_config.enable_experience_based_approval and 
        location_config.enable_experience_based_approval):
        # Check if employee has worked at this location before
        previous_shifts = db.query(Shift).filter(
            Shift.medewerker_id == employee_id,
            Shift.locatie == location,
            Shift.status == "completed"
        ).count()
        
        if previous_shifts > 0:
            return True
    
    # Check if employee has worked at this location recently (within priority window)
    shift = db.query(Shift).filter(Shift.id == shift_id).first()
    if not shift:
        return False
        
    recent_shifts = db.query(Shift).filter(
        Shift.medewerker_id == employee_id,
        Shift.locatie == location,
        Shift.status == "completed",
        Shift.datum >= datetime.now().date() - timedelta(days=30)  # Last 30 days
    ).order_by(Shift.datum.desc()).first()
    
    if recent_shifts:
        # Use location-specific priority window if set, otherwise use global default
        priority_window = (location_config.priority_window_hours 
                         if location_config.priority_window_hours is not None 
                         else global_config.default_priority_window_hours)
        
        # If the shift was created within the priority window
        shift_creation_time = datetime.combine(shift.datum, datetime.min.time())
        if datetime.now() - shift_creation_time <= timedelta(hours=priority_window):
            return True
    
    return False
