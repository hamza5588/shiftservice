from pydantic import BaseModel
from datetime import date
from typing import List, Dict, Any, Optional


class VerloningBase(BaseModel):
    employee_id: str
    datum: date
    bedrag: float
    status: str = "nieuw"


class VerloningCreate(VerloningBase):
    pass


class VerloningResponse(BaseModel):
    id: int
    medewerker_id: int
    datum: date
    bedrag: float
    status: str

    class Config:
        orm_mode = True


class PayrollEntry(BaseModel):
    employee_id: str
    personeelsnummer: int
    naam: str
    uurloner: bool
    total_days: int
    total_hours: float
    total_travel_cost: float
    total_telefoon: float
    total_maaltijd: float
    total_de_minimis: float
    total_wkr: float
    total_km_vergoeding: float
    bonus_percentage: float  # Gemiddeld over alle shifts
    base_pay: float
    total_pay: float
    shifts: List[Dict[str, Any]]
    opmerkingen: Optional[str] = ""
    periode: Optional[int] = None
    periode_start: Optional[str] = None
    periode_end: Optional[str] = None 