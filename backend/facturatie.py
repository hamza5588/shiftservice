from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import date
import os
from auth import require_roles, get_current_user

router = APIRouter(
    prefix="/facturen",
    tags=["facturen"]
)

UPLOAD_FOLDER = "uploaded_facturen"

# Zorg ervoor dat de map bestaat
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


class Factuur(BaseModel):
    id: int = 0  # Wordt automatisch ingesteld bij creatie
    opdrachtgever_id: int  # Koppeling aan de opdrachtgever (bijv. 1)
    locatie: str
    factuurdatum: date
    bedrag: float
    status: str  # Bijvoorbeeld "open", "betaald", "herinnering14", "herinnering30"
    factuur_text: Optional[str] = None  # Geïntegreerde sjabloon-output


fake_facturen_db = []
next_factuur_id = 1


@router.get("/", response_model=List[Factuur])
async def get_facturen(current_user: dict = Depends(require_roles(["boekhouding", "admin", "planner"]))):
    """Haal alle facturen op."""
    return fake_facturen_db


@router.get("/{factuur_id}", response_model=Factuur)
async def get_factuur(factuur_id: int, current_user: dict = Depends(require_roles(["boekhouding", "admin", "planner"]))):
    for factuur in fake_facturen_db:
        if factuur["id"] == factuur_id:
            return factuur
    raise HTTPException(status_code=404, detail="Factuur niet gevonden")


@router.post("/", response_model=Factuur, status_code=201)
async def create_factuur(factuur: Factuur, current_user: dict = Depends(require_roles(["boekhouding", "admin", "planner"]))):
    global next_factuur_id
    factuur_dict = factuur.dict()
    factuur_dict["id"] = next_factuur_id
    next_factuur_id += 1
    fake_facturen_db.append(factuur_dict)
    return factuur_dict


@router.put("/{factuur_id}", response_model=Factuur)
async def update_factuur(factuur_id: int, factuur: Factuur, current_user: dict = Depends(require_roles(["boekhouding", "admin"]))):
    for index, existing_factuur in enumerate(fake_facturen_db):
        if existing_factuur["id"] == factuur_id:
            updated_factuur = factuur.dict()
            updated_factuur["id"] = factuur_id
            fake_facturen_db[index] = updated_factuur
            return updated_factuur
    raise HTTPException(status_code=404, detail="Factuur niet gevonden")


@router.delete("/{factuur_id}", response_model=Factuur)
async def delete_factuur(factuur_id: int, current_user: dict = Depends(require_roles(["boekhouding", "admin"]))):
    for index, factuur in enumerate(fake_facturen_db):
        if factuur["id"] == factuur_id:
            return fake_facturen_db.pop(index)
    raise HTTPException(status_code=404, detail="Factuur niet gevonden")


@router.post("/{factuur_id}/mark-paid", response_model=Factuur)
async def mark_factuur_as_paid(factuur_id: int, current_user: dict = Depends(require_roles(["boekhouding", "admin"]))):
    for factuur in fake_facturen_db:
        if factuur["id"] == factuur_id:
            factuur["status"] = "betaald"
            return factuur
    raise HTTPException(status_code=404, detail="Factuur niet gevonden")


### ✅ **Nieuwe functionaliteiten: Facturen Upload & Download**

@router.post("/upload")
async def upload_factuur(file: UploadFile = File(...), current_user: dict = Depends(require_roles(["admin", "boekhouding"]))):
    """
    Admins en Boekhouding kunnen facturen uploaden.
    De bestandsnaam moet het klantnummer of personeelsnummer bevatten.
    """
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    with open(file_path, "wb") as buffer:
        buffer.write(file.file.read())

    return {"message": f"Factuur {file.filename} geüpload"}


@router.get("/uploads")
async def list_uploaded_facturen(current_user: dict = Depends(require_roles(["admin", "boekhouding"]))):
    """
    Geeft een lijst van alle geüploade facturen terug.
    """
    files = os.listdir(UPLOAD_FOLDER)
    return {"facturen": files}


@router.get("/download/{filename}")
async def download_factuur(filename: str, current_user: dict = Depends(get_current_user)):
    """
    Opdrachtgevers en medewerkers kunnen hun eigen facturen downloaden.
    Admins en Boekhouding kunnen alle facturen downloaden.
    """
    file_path = os.path.join(UPLOAD_FOLDER, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")

    # Controleer of de gebruiker toegang heeft tot dit bestand
    if current_user["role"] not in ["admin", "boekhouding"]:
        if not filename.startswith(str(current_user["username"])):
            raise HTTPException(status_code=403, detail="Geen toegang tot deze factuur")

    return FileResponse(file_path, media_type='application/pdf', filename=filename)
