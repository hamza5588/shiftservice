from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import os
from datetime import datetime
from ..database import get_db
from ..auth import get_current_user, require_roles
from . import models, schemas
from ...pdf_export import generate_invoice_pdf
from ...email_utils import send_invoice_email
from fastapi.responses import FileResponse

router = APIRouter(prefix="/facturatie", tags=["facturatie"])

@router.get("/", response_model=List[schemas.FactuurResponse])
@require_roles(["admin", "boekhouding"])
async def get_facturen(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all invoices."""
    return db.query(models.Factuur).all()

@router.post("/", response_model=schemas.FactuurResponse)
@require_roles(["admin", "boekhouding"])
async def create_factuur(
    factuur: schemas.FactuurCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create a new invoice."""
    # Generate invoice number
    year = datetime.now().year
    last_invoice = db.query(models.Factuur).filter(
        models.Factuur.factuurnummer.like(f"F{year}%")
    ).order_by(models.Factuur.factuurnummer.desc()).first()
    
    if last_invoice:
        last_number = int(last_invoice.factuurnummer[-4:])
        new_number = f"F{year}{str(last_number + 1).zfill(4)}"
    else:
        new_number = f"F{year}0001"
    
    # Create invoice
    db_factuur = models.Factuur(
        factuurnummer=new_number,
        **factuur.dict(exclude={'loonstroken'})
    )
    db.add(db_factuur)
    db.flush()  # Get the ID without committing
    
    # Create loonstroken
    for loonstrook in factuur.loonstroken:
        db_loonstrook = models.Loonstrook(
            factuur_id=db_factuur.id,
            **loonstrook.dict()
        )
        db.add(db_loonstrook)
    
    db.commit()
    db.refresh(db_factuur)
    return db_factuur

@router.get("/{factuur_id}", response_model=schemas.FactuurResponse)
@require_roles(["admin", "boekhouding"])
async def get_factuur(
    factuur_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific invoice."""
    factuur = db.query(models.Factuur).filter(models.Factuur.id == factuur_id).first()
    if not factuur:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return factuur

@router.put("/{factuur_id}", response_model=schemas.FactuurResponse)
@require_roles(["admin", "boekhouding"])
async def update_factuur(
    factuur_id: int,
    factuur_update: schemas.FactuurUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update an invoice."""
    db_factuur = db.query(models.Factuur).filter(models.Factuur.id == factuur_id).first()
    if not db_factuur:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    for field, value in factuur_update.dict(exclude_unset=True).items():
        setattr(db_factuur, field, value)
    
    db.commit()
    db.refresh(db_factuur)
    return db_factuur

@router.post("/{factuur_id}/send")
@require_roles(["admin", "boekhouding"])
async def send_factuur(
    factuur_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Send an invoice via email."""
    factuur = db.query(models.Factuur).filter(models.Factuur.id == factuur_id).first()
    if not factuur:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Generate PDF
    pdf_path = generate_invoice_pdf(factuur)
    
    # Send email
    opdrachtgever = db.query(models.Opdrachtgever).filter(
        models.Opdrachtgever.id == factuur.opdrachtgever_id
    ).first()
    
    if not opdrachtgever or not opdrachtgever.email:
        raise HTTPException(status_code=400, detail="Client email not found")
    
    send_invoice_email(factuur, opdrachtgever.email, pdf_path)
    
    # Update status
    factuur.status = "verzonden"
    db.commit()
    
    return {"message": "Invoice sent successfully"}

@router.post("/upload")
@require_roles(["admin", "boekhouding"])
async def upload_factuur(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Upload an invoice file."""
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    # Create uploads directory if it doesn't exist
    upload_dir = "uploads/facturen"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save file
    file_path = os.path.join(upload_dir, file.filename)
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    return {"message": "File uploaded successfully", "path": file_path}

@router.get("/download/{filename}")
@require_roles(["admin", "boekhouding"])
async def download_factuur(
    filename: str,
    current_user: dict = Depends(get_current_user)
):
    """Download an invoice file."""
    file_path = os.path.join("uploads/facturen", filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(file_path, filename=filename) 