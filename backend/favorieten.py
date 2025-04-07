from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
from auth import get_current_user

router = APIRouter(
    prefix="/favorieten",
    tags=["favorieten"]
)

class Favorite(BaseModel):
    id: int = 0  # Wordt automatisch ingesteld bij creatie
    type: str  # Bijvoorbeeld "medewerker" of "locatie"
    target_id: int  # Het ID van de medewerker of locatie
    name: str  # Een beschrijvende naam

# Simuleer een in-memory database met favorieten
fake_favorites_db = []
next_favorite_id = 1

@router.get("/", response_model=List[Favorite])
async def get_favorites(current_user: dict = Depends(get_current_user)):
    """Haal alle favorieten op voor de ingelogde gebruiker."""
    return fake_favorites_db

@router.post("/", response_model=Favorite, status_code=201)
async def add_favorite(favorite: Favorite, current_user: dict = Depends(get_current_user)):
    """Voeg een nieuwe favoriet toe."""
    global next_favorite_id
    favorite_dict = favorite.dict()
    favorite_dict["id"] = next_favorite_id
    next_favorite_id += 1
    fake_favorites_db.append(favorite_dict)
    return favorite_dict

@router.delete("/{favorite_id}", response_model=Favorite)
async def delete_favorite(favorite_id: int, current_user: dict = Depends(get_current_user)):
    """Verwijder een favoriet op basis van het ID."""
    for idx, fav in enumerate(fake_favorites_db):
        if fav["id"] == favorite_id:
            removed = fake_favorites_db.pop(idx)
            return removed
    raise HTTPException(status_code=404, detail="Favoriet niet gevonden")
