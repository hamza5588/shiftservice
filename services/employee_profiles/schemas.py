from pydantic import BaseModel, Field
from typing import Optional

class EmployeeProfileBase(BaseModel):
    pass_type: str
    phone_allowance: float = 0.0
    meal_allowance: float = 0.0
    de_minimis_bonus: float = 0.0
    wkr_surcharge: float = 0.0
    travel_allowance: float = 0.0
    is_active: bool = True

class EmployeeProfileCreate(EmployeeProfileBase):
    medewerker_id: str

class EmployeeProfileResponse(EmployeeProfileBase):
    id: int
    medewerker_id: str

    class Config:
        from_attributes = True

class EmployeeProfileUpdate(BaseModel):
    pass_type: Optional[str] = None
    phone_allowance: Optional[float] = None
    meal_allowance: Optional[float] = None
    de_minimis_bonus: Optional[float] = None
    wkr_surcharge: Optional[float] = None
    travel_allowance: Optional[float] = None
    is_active: Optional[bool] = None 