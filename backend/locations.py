from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from models import Location, Opdrachtgever
from pydantic import BaseModel

router = APIRouter()

class LocationBase(BaseModel):
    naam: str
    adres: str
    stad: str
    postcode: str
    opdrachtgever_id: Optional[int] = None

class LocationCreate(LocationBase):
    pass

class LocationResponse(LocationBase):
    id: int

    class Config:
        orm_mode = True

@router.post("/locations/", response_model=LocationResponse)
def create_location(location: LocationCreate, db: Session = Depends(get_db)):
    # Check if opdrachtgever exists
    opdrachtgever = db.query(Opdrachtgever).filter(Opdrachtgever.id == location.opdrachtgever_id).first()
    if not opdrachtgever:
        raise HTTPException(status_code=404, detail="Opdrachtgever not found")

    db_location = Location(**location.dict())
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location

@router.get("/locations/", response_model=List[LocationResponse])
def get_locations(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    locations = db.query(Location).offset(skip).limit(limit).all()
    return locations

@router.get("/locations/{location_id}", response_model=LocationResponse)
def get_location(location_id: int, db: Session = Depends(get_db)):
    location = db.query(Location).filter(Location.id == location_id).first()
    if location is None:
        raise HTTPException(status_code=404, detail="Location not found")
    return location

@router.get("/locations/opdrachtgever/{opdrachtgever_id}", response_model=List[LocationResponse])
def get_locations_by_opdrachtgever(opdrachtgever_id: int, db: Session = Depends(get_db)):
    locations = db.query(Location).filter(Location.opdrachtgever_id == opdrachtgever_id).all()
    return locations

@router.put("/locations/{location_id}", response_model=LocationResponse)
def update_location(location_id: int, location: LocationCreate, db: Session = Depends(get_db)):
    db_location = db.query(Location).filter(Location.id == location_id).first()
    if db_location is None:
        raise HTTPException(status_code=404, detail="Location not found")

    for key, value in location.dict().items():
        setattr(db_location, key, value)

    db.commit()
    db.refresh(db_location)
    return db_location

@router.delete("/locations/{location_id}")
def delete_location(location_id: int, db: Session = Depends(get_db)):
    db_location = db.query(Location).filter(Location.id == location_id).first()
    if db_location is None:
        raise HTTPException(status_code=404, detail="Location not found")

    db.delete(db_location)
    db.commit()
    return {"message": "Location deleted successfully"} 