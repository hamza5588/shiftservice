from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from auth import require_roles

router = APIRouter(
    prefix="/factuursjablonen",
    tags=["factuursjablonen"]
)

class Factuursjabloon(BaseModel):
    id: int = 0  # Wordt automatisch ingesteld bij creatie
    opdrachtgever_id: int
    template: str  # Bijvoorbeeld een tekst met placeholders zoals {opdrachtgever_naam}, {adres}, etc.
    beschrijving: Optional[str] = None

fake_factuursjablonen_db: List[dict] = []
next_factuursjabloon_id = 1

@router.get("/", response_model=List[Factuursjabloon])
async def get_factuursjablonen(current_user: dict = Depends(require_roles(["admin", "boekhouding"]))):
    return fake_factuursjablonen_db

@router.get("/{sjabloon_id}", response_model=Factuursjabloon)
async def get_factuursjabloon(sjabloon_id: int, current_user: dict = Depends(require_roles(["admin", "boekhouding"]))):
    for sjabloon in fake_factuursjablonen_db:
        if sjabloon["id"] == sjabloon_id:
            return sjabloon
    raise HTTPException(status_code=404, detail="Factuursjabloon niet gevonden")

@router.post("/", response_model=Factuursjabloon, status_code=201)
async def create_factuursjabloon(sjabloon: Factuursjabloon, current_user: dict = Depends(require_roles(["admin", "boekhouding"]))):
    global next_factuursjabloon_id
    sjabloon.id = next_factuursjabloon_id
    next_factuursjabloon_id += 1
    fake_factuursjablonen_db.append(sjabloon.dict())
    return sjabloon

@router.put("/{sjabloon_id}", response_model=Factuursjabloon)
async def update_factuursjabloon(sjabloon_id: int, sjabloon: Factuursjabloon, current_user: dict = Depends(require_roles(["admin", "boekhouding"]))):
    for index, existing in enumerate(fake_factuursjablonen_db):
        if existing["id"] == sjabloon_id:
            sjabloon.id = sjabloon_id
            fake_factuursjablonen_db[index] = sjabloon.dict()
            return sjabloon
    raise HTTPException(status_code=404, detail="Factuursjabloon niet gevonden")

@router.delete("/{sjabloon_id}", response_model=Factuursjabloon)
async def delete_factuursjabloon(sjabloon_id: int, current_user: dict = Depends(require_roles(["admin", "boekhouding"]))):
    for index, sjabloon in enumerate(fake_factuursjablonen_db):
        if sjabloon["id"] == sjabloon_id:
            return fake_factuursjablonen_db.pop(index)
    raise HTTPException(status_code=404, detail="Factuursjabloon niet gevonden")
