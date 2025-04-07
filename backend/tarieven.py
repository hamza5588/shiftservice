from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from auth import require_roles

router = APIRouter(
    prefix="/tarieven",
    tags=["tarieven"]
)

class Tarief(BaseModel):
    id: int = 0  # Wordt automatisch ingesteld
    opdrachtgever_id: int  # Tarief is gekoppeld aan een specifieke opdrachtgever
    location: Optional[str] = None  # Als het tarief per locatie varieert, vul dit dan in
    pas_type: str  # Bijvoorbeeld "Grijze pas", "Blauwe pas (Horeca)", etc.
    hourly_rate: float  # Het uurtarief voor dit pas-type

fake_tarieven_db: List[dict] = []
next_tarief_id = 1

@router.get("/", response_model=List[Tarief])
async def get_tarieven(
    opdrachtgever_id: Optional[int] = Query(None),
    location: Optional[str] = Query(None),
    pas_type: Optional[str] = Query(None),
    current_user: dict = Depends(require_roles(["admin", "boekhouding"]))
):
    tarieven = fake_tarieven_db
    if opdrachtgever_id is not None:
        tarieven = [t for t in tarieven if t.get("opdrachtgever_id") == opdrachtgever_id]
    if location:
        tarieven = [t for t in tarieven if t.get("location", "").lower() == location.lower()]
    if pas_type:
        tarieven = [t for t in tarieven if t.get("pas_type", "").lower() == pas_type.lower()]
    return tarieven

@router.get("/{tarief_id}", response_model=Tarief)
async def get_tarief(tarief_id: int, current_user: dict = Depends(require_roles(["admin", "boekhouding"]))):
    for tarief in fake_tarieven_db:
        if tarief["id"] == tarief_id:
            return tarief
    raise HTTPException(status_code=404, detail="Tarief niet gevonden")

@router.post("/", response_model=Tarief, status_code=201)
async def create_tarief(tarief: Tarief, current_user: dict = Depends(require_roles(["admin", "boekhouding"]))):
    global next_tarief_id
    tarief.id = next_tarief_id
    next_tarief_id += 1
    fake_tarieven_db.append(tarief.dict())
    return tarief

@router.put("/{tarief_id}", response_model=Tarief)
async def update_tarief(tarief_id: int, tarief: Tarief, current_user: dict = Depends(require_roles(["admin", "boekhouding"]))):
    for index, existing in enumerate(fake_tarieven_db):
        if existing["id"] == tarief_id:
            tarief.id = tarief_id
            fake_tarieven_db[index] = tarief.dict()
            return tarief
    raise HTTPException(status_code=404, detail="Tarief niet gevonden")

@router.delete("/{tarief_id}", response_model=Tarief)
async def delete_tarief(tarief_id: int, current_user: dict = Depends(require_roles(["admin", "boekhouding"]))):
    for index, tarief in enumerate(fake_tarieven_db):
        if tarief["id"] == tarief_id:
            return fake_tarieven_db.pop(index)
    raise HTTPException(status_code=404, detail="Tarief niet gevonden")
