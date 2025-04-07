from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List
from datetime import datetime
from auth import get_current_user

router = APIRouter(
    prefix="/tijdlijn",
    tags=["tijdlijn"]
)

class Note(BaseModel):
    id: int = 0  # Wordt automatisch ingesteld bij creatie
    associated_type: str  # 'opdrachtgever' of 'medewerker'
    associated_id: int    # Het ID van de opdrachtgever of medewerker
    content: str
    timestamp: datetime = None

# Simuleer een database met een lijst van notities
fake_notes_db = []
next_note_id = 1

@router.get("/", response_model=List[Note])
async def get_notes(current_user: dict = Depends(get_current_user)):
    """Haal alle notities op."""
    return fake_notes_db

@router.get("/{note_id}", response_model=Note)
async def get_note(note_id: int, current_user: dict = Depends(get_current_user)):
    """Haal een specifieke notitie op via het ID."""
    for note in fake_notes_db:
        if note["id"] == note_id:
            return note
    raise HTTPException(status_code=404, detail="Notitie niet gevonden")

@router.post("/", response_model=Note, status_code=201)
async def create_note(note: Note, current_user: dict = Depends(get_current_user)):
    """Maak een nieuwe notitie aan."""
    global next_note_id
    note_dict = note.dict()
    note_dict["id"] = next_note_id
    # Als er geen timestamp is opgegeven, gebruik de huidige UTC-tijd
    if note_dict.get("timestamp") is None:
        note_dict["timestamp"] = datetime.utcnow()
    next_note_id += 1
    fake_notes_db.append(note_dict)
    return note_dict

@router.put("/{note_id}", response_model=Note)
async def update_note(note_id: int, note: Note, current_user: dict = Depends(get_current_user)):
    """Werk een bestaande notitie bij."""
    for idx, existing_note in enumerate(fake_notes_db):
        if existing_note["id"] == note_id:
            updated_note = note.dict()
            updated_note["id"] = note_id  # Behoud het ID
            fake_notes_db[idx] = updated_note
            return updated_note
    raise HTTPException(status_code=404, detail="Notitie niet gevonden")

@router.delete("/{note_id}", response_model=Note)
async def delete_note(note_id: int, current_user: dict = Depends(get_current_user)):
    """Verwijder een notitie op basis van het ID."""
    for idx, note in enumerate(fake_notes_db):
        if note["id"] == note_id:
            removed_note = fake_notes_db.pop(idx)
            return removed_note
    raise HTTPException(status_code=404, detail="Notitie niet gevonden")
