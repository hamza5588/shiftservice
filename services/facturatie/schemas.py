from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date

class LoonstrookBase(BaseModel):
    medewerker_id: str
    periode: str
    uren: float
    tarief: float
    bedrag: float

class LoonstrookCreate(LoonstrookBase):
    pass

class LoonstrookResponse(LoonstrookBase):
    id: int
    factuur_id: int

    class Config:
        from_attributes = True

class FactuurBase(BaseModel):
    opdrachtgever_id: Optional[str] = None
    opdrachtgever_naam: Optional[str] = None
    locatie: Optional[str] = None
    datum: date
    vervaldatum: date
    bedrag: float
    status: str = "open"
    factuur_text: Optional[str] = None

class FactuurCreate(FactuurBase):
    loonstroken: List[LoonstrookCreate]

class FactuurResponse(FactuurBase):
    id: int
    factuurnummer: str
    loonstroken: List[LoonstrookResponse]

    class Config:
        from_attributes = True

class FactuurUpdate(BaseModel):
    status: Optional[str] = None
    factuur_text: Optional[str] = None 