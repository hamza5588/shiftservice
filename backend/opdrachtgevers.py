from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional
from sqlalchemy.orm import Session
from database import get_db
from models import Opdrachtgever
from auth import get_current_user

router = APIRouter(
    prefix="/opdrachtgevers",
    tags=["opdrachtgevers"]
)

class OpdrachtgeverBase(BaseModel):
    naam: str
    bedrijfsnaam: Optional[str] = None
    kvk_nummer: Optional[str] = None
    adres: Optional[str] = None
    postcode: Optional[str] = None
    stad: Optional[str] = None
    telefoon: Optional[str] = None
    email: str

class OpdrachtgeverCreate(OpdrachtgeverBase):
    pass

class OpdrachtgeverResponse(OpdrachtgeverBase):
    id: int

    class Config:
        orm_mode = True

@router.get("/", response_model=List[OpdrachtgeverResponse])
async def get_opdrachtgevers(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Haal alle opdrachtgevers op."""
    return db.query(Opdrachtgever).all()

@router.post("/", response_model=OpdrachtgeverResponse, status_code=201)
async def create_opdrachtgever(
    opdrachtgever: OpdrachtgeverCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Maak een nieuwe opdrachtgever aan."""
    # Check if email already exists
    existing_opdrachtgever = db.query(Opdrachtgever).filter(Opdrachtgever.email == opdrachtgever.email).first()
    if existing_opdrachtgever:
        raise HTTPException(status_code=400, detail="Email bestaat al")

    db_opdrachtgever = Opdrachtgever(**opdrachtgever.dict())
    db.add(db_opdrachtgever)
    db.commit()
    db.refresh(db_opdrachtgever)
    return db_opdrachtgever

@router.get("/{opdrachtgever_id}", response_model=OpdrachtgeverResponse)
async def get_opdrachtgever(
    opdrachtgever_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Haal een specifieke opdrachtgever op."""
    opdrachtgever = db.query(Opdrachtgever).filter(Opdrachtgever.id == opdrachtgever_id).first()
    if not opdrachtgever:
        raise HTTPException(status_code=404, detail="Opdrachtgever niet gevonden")
    return opdrachtgever

@router.put("/{opdrachtgever_id}", response_model=OpdrachtgeverResponse)
async def update_opdrachtgever(
    opdrachtgever_id: int,
    opdrachtgever_update: OpdrachtgeverBase,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update een bestaande opdrachtgever."""
    db_opdrachtgever = db.query(Opdrachtgever).filter(Opdrachtgever.id == opdrachtgever_id).first()
    if not db_opdrachtgever:
        raise HTTPException(status_code=404, detail="Opdrachtgever niet gevonden")

    # Check if new email already exists for other opdrachtgevers
    if opdrachtgever_update.email != db_opdrachtgever.email:
        existing_opdrachtgever = db.query(Opdrachtgever).filter(
            Opdrachtgever.email == opdrachtgever_update.email,
            Opdrachtgever.id != opdrachtgever_id
        ).first()
        if existing_opdrachtgever:
            raise HTTPException(status_code=400, detail="Email bestaat al")

    for key, value in opdrachtgever_update.dict().items():
        setattr(db_opdrachtgever, key, value)

    db.commit()
    db.refresh(db_opdrachtgever)
    return db_opdrachtgever

@router.delete("/{opdrachtgever_id}")
async def delete_opdrachtgever(
    opdrachtgever_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Verwijder een opdrachtgever."""
    db_opdrachtgever = db.query(Opdrachtgever).filter(Opdrachtgever.id == opdrachtgever_id).first()
    if not db_opdrachtgever:
        raise HTTPException(status_code=404, detail="Opdrachtgever niet gevonden")

    db.delete(db_opdrachtgever)
    db.commit()
    return {"message": "Opdrachtgever verwijderd"}
