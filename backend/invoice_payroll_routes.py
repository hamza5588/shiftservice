from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime
from models import Factuur, Verloning, Medewerker, Opdrachtgever, Loonstrook
from database import get_db
from invoice_payroll import generate_invoice, generate_payroll, generate_invoice_pdf, generate_payroll_pdf
import csv
from io import StringIO
from fastapi.responses import StreamingResponse, FileResponse
import os
import shutil
from pathlib import Path
import zipfile
import logging
from utils import require_roles

router = APIRouter(
    prefix="/invoice-payroll",
    tags=["invoice-payroll"]
)

# Create uploads directory if it doesn't exist
UPLOADS_DIR = Path("uploads/loonstroken")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Invoice endpoints
@router.get("/facturen/", response_model=List[dict])
def get_invoices(
    opdrachtgever_id: Optional[int] = None,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    db: Session = Depends(get_db)
):
    """Get all invoices with optional filters."""
    query = db.query(Factuur)
    
    if opdrachtgever_id:
        query = query.filter(Factuur.opdrachtgever_id == opdrachtgever_id)
    if status:
        query = query.filter(Factuur.status == status)
    if start_date:
        query = query.filter(Factuur.datum >= start_date)
    if end_date:
        query = query.filter(Factuur.datum <= end_date)
    
    invoices = query.all()
    return [{
        "id": invoice.id,
        "factuurnummer": invoice.factuurnummer,
        "opdrachtgever_id": invoice.opdrachtgever_id,
        "datum": invoice.datum,
        "vervaldatum": invoice.vervaldatum,
        "bedrag": invoice.bedrag,
        "btw_bedrag": invoice.btw_bedrag,
        "totaal_bedrag": invoice.totaal_bedrag,
        "status": invoice.status,
        "breakdown": invoice.breakdown
    } for invoice in invoices]

@router.get("/facturen/{invoice_id}", response_model=dict)
def get_invoice(invoice_id: int, db: Session = Depends(get_db)):
    """Get a specific invoice by ID."""
    invoice = db.query(Factuur).filter(Factuur.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    return {
        "id": invoice.id,
        "factuurnummer": invoice.factuurnummer,
        "opdrachtgever_id": invoice.opdrachtgever_id,
        "datum": invoice.datum,
        "vervaldatum": invoice.vervaldatum,
        "bedrag": invoice.bedrag,
        "btw_bedrag": invoice.btw_bedrag,
        "totaal_bedrag": invoice.totaal_bedrag,
        "status": invoice.status,
        "breakdown": invoice.breakdown
    }

@router.get("/facturen/nummer/{factuurnummer}", response_model=dict)
def get_invoice_by_number(factuurnummer: str, db: Session = Depends(get_db)):
    """Get a specific invoice by factuurnummer."""
    try:
        invoice = db.query(Factuur).filter(Factuur.factuurnummer == factuurnummer).first()
        if not invoice:
            raise HTTPException(status_code=404, detail=f"Invoice with factuurnummer {factuurnummer} not found")
        
        return {
            "id": invoice.id,
            "factuurnummer": invoice.factuurnummer,
            "opdrachtgever_id": invoice.opdrachtgever_id,
            "datum": invoice.datum,
            "vervaldatum": invoice.vervaldatum,
            "bedrag": invoice.bedrag,
            "btw_bedrag": invoice.btw_bedrag,
            "totaal_bedrag": invoice.totaal_bedrag,
            "status": invoice.status,
            "breakdown": invoice.breakdown
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/facturen/")
def create_invoice(
    opdrachtgever_id: int,
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db)
):
    """Create a new invoice for a specific period."""
    logger.info(f"Received invoice creation request for opdrachtgever_id: {opdrachtgever_id}, start_date: {start_date}, end_date: {end_date}")
    
    try:
        # Verify opdrachtgever exists
        opdrachtgever = db.query(Opdrachtgever).filter(Opdrachtgever.id == opdrachtgever_id).first()
        if not opdrachtgever:
            logger.error(f"Opdrachtgever not found with id: {opdrachtgever_id}")
            raise HTTPException(status_code=404, detail="Opdrachtgever not found")
        
        logger.info(f"Found opdrachtgever: {opdrachtgever.naam}")
        
        # Generate invoice
        logger.info("Starting invoice generation...")
        invoice = generate_invoice(db, opdrachtgever_id, start_date, end_date)
        logger.info(f"Invoice generated successfully with id: {invoice.id}")
        
        return {
            "message": "Invoice created successfully",
            "invoice_id": invoice.id,
            "factuurnummer": invoice.factuurnummer,
            "bedrag": invoice.bedrag,
            "btw_bedrag": invoice.btw_bedrag,
            "totaal_bedrag": invoice.totaal_bedrag
        }
    except Exception as e:
        logger.error(f"Error creating invoice: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating invoice: {str(e)}")

@router.put("/facturen/{invoice_id}")
def update_invoice(
    invoice_id: int,
    status: str,
    db: Session = Depends(get_db)
):
    """Update an invoice's status."""
    invoice = db.query(Factuur).filter(Factuur.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    invoice.status = status
    db.commit()
    return {"message": "Invoice updated successfully"}

@router.delete("/facturen/{invoice_id}")
async def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["admin", "boekhouding"]))
):
    """Delete an invoice."""
    try:
        logger.info(f"Deleting invoice with ID: {invoice_id}")
        invoice = db.query(Factuur).filter(Factuur.id == invoice_id).first()
        if not invoice:
            logger.warning(f"Invoice not found with ID: {invoice_id}")
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        db.delete(invoice)
        db.commit()
        logger.info(f"Successfully deleted invoice with ID: {invoice_id}")
        return {"message": "Invoice deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting invoice {invoice_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error deleting invoice")

@router.delete("/facturen/by-factuurnummer/{factuurnummer}")
async def delete_invoice_by_factuurnummer(
    factuurnummer: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["admin", "boekhouding"]))
):
    """Delete an invoice by factuurnummer."""
    try:
        logger.info(f"Deleting invoice with factuurnummer: {factuurnummer}")
        invoice = db.query(Factuur).filter(Factuur.factuurnummer == factuurnummer).first()
        if not invoice:
            logger.warning(f"Invoice not found with factuurnummer: {factuurnummer}")
            raise HTTPException(status_code=404, detail="Invoice not found")
        
        db.delete(invoice)
        db.commit()
        
        logger.info(f"Successfully deleted invoice with factuurnummer: {factuurnummer}")
        return {"message": "Invoice deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting invoice with factuurnummer {factuurnummer}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error deleting invoice")

# Payroll endpoints
@router.get("/verloning/", response_model=List[dict])
def get_payroll(
    medewerker_id: Optional[int] = None,
    period: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all payroll records with optional filters."""
    query = db.query(Verloning)
    
    if medewerker_id:
        query = query.filter(Verloning.medewerker_id == medewerker_id)
    if period:
        query = query.filter(Verloning.periode == period)
    
    payrolls = query.all()
    return [{
        "id": payroll.id,
        "medewerker_id": payroll.medewerker_id,
        "periode": payroll.periode,
        "datum": payroll.datum,
        "basis_loon": payroll.basis_loon,
        "avond_toeslag": payroll.avond_toeslag,
        "nacht_toeslag": payroll.nacht_toeslag,
        "weekend_toeslag": payroll.weekend_toeslag,
        "feestdag_toeslag": payroll.feestdag_toeslag,
        "oudjaarsavond_toeslag": payroll.oudjaarsavond_toeslag,
        "totaal_bedrag": payroll.totaal_bedrag,
        "status": payroll.status,
        "breakdown": payroll.breakdown
    } for payroll in payrolls]

@router.get("/verloning/export")
def export_payroll(
    year: int = Query(..., description="Year to export"),
    db: Session = Depends(get_db)
):
    """Export payroll data as CSV for a specific year."""
    payrolls = db.query(Verloning).filter(
        Verloning.periode.like(f"{year}-%")
    ).all()
    
    if not payrolls:
        raise HTTPException(status_code=404, detail="No payroll data found for the specified year")
    
    # Create CSV in memory
    output = StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow([
        "Employee ID",
        "Period",
        "Date",
        "Base Salary",
        "Evening Bonus",
        "Night Bonus",
        "Weekend Bonus",
        "Holiday Bonus",
        "New Year's Eve Bonus",
        "Total Amount",
        "Status"
    ])
    
    # Write data
    for payroll in payrolls:
        writer.writerow([
            payroll.medewerker_id,
            payroll.periode,
            payroll.datum,
            payroll.basis_loon,
            payroll.avond_toeslag,
            payroll.nacht_toeslag,
            payroll.weekend_toeslag,
            payroll.feestdag_toeslag,
            payroll.oudjaarsavond_toeslag,
            payroll.totaal_bedrag,
            payroll.status
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=payroll_export_{year}.csv"
        }
    )

@router.post("/verloning/")
def create_payroll(
    medewerker_id: int,
    period: str,
    db: Session = Depends(get_db)
):
    """Create a new payroll record for an employee for a specific period."""
    medewerker = db.query(Medewerker).filter(Medewerker.id == medewerker_id).first()
    if not medewerker:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    payroll = generate_payroll(db, medewerker_id, period)
    return {"message": "Payroll created successfully", "payroll_id": payroll.id}

@router.get("/pdf-export/facturen/{invoice_id}")
def export_invoice_pdf(invoice_id: int, db: Session = Depends(get_db)):
    """Export an invoice as PDF."""
    invoice = db.query(Factuur).filter(Factuur.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    opdrachtgever = db.query(Opdrachtgever).filter(Opdrachtgever.id == invoice.opdrachtgever_id).first()
    if not opdrachtgever:
        raise HTTPException(status_code=404, detail="Opdrachtgever not found")
    
    pdf_content = generate_invoice_pdf(invoice, opdrachtgever)
    
    return StreamingResponse(
        iter([pdf_content]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=factuur_{invoice.factuurnummer}.pdf"
        }
    )

@router.post("/verloning/upload")
async def upload_payroll_file(
    employee_id: int,
    period: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload a payroll file for an employee."""
    # Verify employee exists
    employee = db.query(Medewerker).filter(Medewerker.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Create filename
    filename = f"loonstrook_{employee_id}_{period}_{file.filename}"
    file_path = UPLOADS_DIR / filename
    
    # Save file
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error saving file: {str(e)}")
    
    # Create database record
    loonstrook = Loonstrook(
        medewerker_id=employee_id,
        periode=period,
        bestand=filename
    )
    
    db.add(loonstrook)
    db.commit()
    
    return {"message": "File uploaded successfully", "filename": filename}

@router.get("/verloning/uploads")
def list_payroll_files(
    employee_id: Optional[int] = None,
    period: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all uploaded payroll files with optional filters."""
    query = db.query(Loonstrook)
    
    if employee_id:
        query = query.filter(Loonstrook.medewerker_id == employee_id)
    if period:
        query = query.filter(Loonstrook.periode == period)
    
    files = query.all()
    return [{
        "id": file.id,
        "employee_id": file.medewerker_id,
        "period": file.periode,
        "filename": file.bestand,
        "upload_date": file.upload_date
    } for file in files]

@router.get("/verloning/download/{employee_id}")
def download_employee_payroll(
    employee_id: int,
    db: Session = Depends(get_db)
):
    """Download all payroll files for an employee."""
    # Verify employee exists
    employee = db.query(Medewerker).filter(Medewerker.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Get all files for employee
    files = db.query(Loonstrook).filter(Loonstrook.medewerker_id == employee_id).all()
    if not files:
        raise HTTPException(status_code=404, detail="No payroll files found for employee")
    
    # Create zip file
    zip_path = UPLOADS_DIR / f"loonstroken_{employee_id}.zip"
    with zipfile.ZipFile(zip_path, 'w') as zipf:
        for file in files:
            file_path = UPLOADS_DIR / file.bestand
            if file_path.exists():
                zipf.write(file_path, file.bestand)
    
    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename=f"loonstroken_{employee_id}.zip"
    )

@router.get("/verloning/download/{employee_id}/{filename}")
def download_specific_payroll(
    employee_id: int,
    filename: str,
    db: Session = Depends(get_db)
):
    """Download a specific payroll file."""
    # Verify employee exists
    employee = db.query(Medewerker).filter(Medewerker.id == employee_id).first()
    if not employee:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    # Verify file exists
    file_path = UPLOADS_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    # Verify file belongs to employee
    loonstrook = db.query(Loonstrook).filter(
        Loonstrook.medewerker_id == employee_id,
        Loonstrook.bestand == filename
    ).first()
    if not loonstrook:
        raise HTTPException(status_code=403, detail="File does not belong to employee")
    
    return FileResponse(
        file_path,
        media_type="application/octet-stream",
        filename=filename
    )

@router.get("/verloning/pdf/{payroll_id}")
def export_payroll_pdf(payroll_id: int, db: Session = Depends(get_db)):
    """Export a payroll record as PDF."""
    payroll = db.query(Verloning).filter(Verloning.id == payroll_id).first()
    if not payroll:
        raise HTTPException(status_code=404, detail="Payroll record not found")
    
    medewerker = db.query(Medewerker).filter(Medewerker.id == payroll.medewerker_id).first()
    if not medewerker:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    pdf_content = generate_payroll_pdf(payroll, medewerker)
    
    return StreamingResponse(
        iter([pdf_content]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=loonstrook_{medewerker.naam}_{payroll.periode}.pdf"
        }
    )

@router.get("/generate")
async def generate_invoice_endpoint(
    opdrachtgever_id: int,
    start_date: date,
    end_date: date,
    db: Session = Depends(get_db)
):
    """Generate an invoice for a specific client and date range."""
    try:
        invoice = generate_invoice(db, opdrachtgever_id, start_date, end_date)
        return invoice
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 