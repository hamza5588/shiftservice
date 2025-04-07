from pydantic import BaseModel, Field
from typing import Optional
from datetime import date

class DienstaanvraagBase(BaseModel):
    datum: date
    start_tijd: str
    eind_tijd: str
    locatie: str
    opmerkingen: Optional[str] = None

class DienstaanvraagCreate(DienstaanvraagBase):
    pass

class DienstaanvraagResponse(DienstaanvraagBase):
    id: int
    medewerker_id: str
    status: str

    class Config:
        from_attributes = True

class DienstaanvraagUpdate(BaseModel):
    status: str
    opmerkingen: Optional[str] = None 