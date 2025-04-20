from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional, Dict, Any

class LocationRateBase(BaseModel):
    location_id: int
    pass_type: str
    base_rate: float
    evening_rate: float
    night_rate: float
    weekend_rate: float
    holiday_rate: float
    new_years_eve_rate: float

class LocationRateCreate(LocationRateBase):
    pass

class LocationRatePydantic(LocationRateBase):
    id: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    location: Optional[Dict[str, Any]] = None

    class Config:
        orm_mode = True
        arbitrary_types_allowed = True
        json_encoders = {
            datetime: lambda dt: dt.isoformat() if dt else None
        } 