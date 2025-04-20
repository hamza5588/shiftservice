from pydantic import BaseModel
from typing import List, Optional
from datetime import date, time

class ShiftBase(BaseModel):
    shift_date: date
    start_time: time
    end_time: time
    location_id: int
    employee_id: Optional[str] = None
    status: str = "open"
    
    # Optional fields
    titel: Optional[str] = None
    stad: Optional[str] = None
    provincie: Optional[str] = None
    adres: Optional[str] = None
    required_profile: Optional[str] = None

class ShiftCreate(ShiftBase):
    pass

class ShiftResponse(ShiftBase):
    id: int

    class Config:
        orm_mode = True

class Shift(ShiftBase):
    id: int = 0
    employee_ids: List[str] = [] 