from fastapi import APIRouter, HTTPException, Depends, Query, UploadFile, File
from typing import List, Optional
from datetime import date, datetime
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from auth import get_current_user, require_roles
from models import Invoice, InvoiceItem, PayrollEntry, PayrollPeriod, PayrollDocument
from invoice_service import create_invoice, create_payroll_entry
import os
import shutil
from pathlib import Path

router = APIRouter(
    prefix="/facturen",
    tags=["facturen"]
)

# Pydantic models for request/response
class InvoiceBase(BaseModel):
    employee_id: str
    location_id: int
    period_start: date
    period_end: date
    base_rate: float

class InvoiceResponse(InvoiceBase):
    id: int
    invoice_number: str
    total_hours: float
    total_amount: float
    vat_amount: float
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

class InvoiceItemResponse(BaseModel):
    id: int
    invoice_id: int
    shift_id: int
    date: date
    start_time: str
    end_time: str
    hours_worked: float
    rate_type: str
    base_rate: float
    bonus_percentage: float
    total_amount: float

    class Config:
        orm_mode = True

class PayrollPeriodBase(BaseModel):
    year: int
    period_number: int
    start_date: date
    end_date: date

class PayrollPeriodResponse(PayrollPeriodBase):
    id: int
    status: str

    class Config:
        orm_mode = True

class PayrollEntryBase(BaseModel):
    employee_id: str
    period_id: int
    base_salary: float
    phone_allowance: Optional[float] = 0.0
    meal_allowance: Optional[float] = 0.0
    travel_allowance: Optional[float] = 0.0

class PayrollEntryResponse(PayrollEntryBase):
    id: int
    total_hours: float
    evening_bonus: float
    night_bonus: float
    weekend_bonus: float
    holiday_bonus: float
    new_year_bonus: float
    total_amount: float
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True

# Invoice endpoints
@router.get("/", response_model=List[InvoiceResponse])
async def get_invoices(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all invoices."""
    if "admin" not in current_user["roles"] and "boekhouding" not in current_user["roles"]:
        raise HTTPException(status_code=403, detail="Not authorized to view invoices")
    
    return db.query(Invoice).all()

@router.get("/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific invoice by ID."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    if ("admin" not in current_user["roles"] and 
        "boekhouding" not in current_user["roles"] and 
        invoice.employee_id != current_user["username"]):
        raise HTTPException(status_code=403, detail="Not authorized to view this invoice")
    
    return invoice

@router.post("/", response_model=InvoiceResponse)
async def create_invoice_endpoint(
    invoice: InvoiceBase,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["admin", "boekhouding"]))
):
    """Create a new invoice."""
    try:
        return create_invoice(
            db=db,
            employee_id=invoice.employee_id,
            location_id=invoice.location_id,
            period_start=invoice.period_start,
            period_end=invoice.period_end,
            base_rate=invoice.base_rate
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: int,
    invoice_update: InvoiceBase,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["admin", "boekhouding"]))
):
    """Update an existing invoice."""
    db_invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    for key, value in invoice_update.dict().items():
        setattr(db_invoice, key, value)
    
    db.commit()
    db.refresh(db_invoice)
    return db_invoice

@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["admin"]))
):
    """Delete an invoice."""
    db_invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not db_invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    db.delete(db_invoice)
    db.commit()
    return {"message": "Invoice deleted successfully"}

# Payroll endpoints
@router.get("/verloning/", response_model=List[PayrollEntryResponse])
async def get_payroll_entries(
    year: Optional[int] = None,
    period: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all payroll entries, optionally filtered by year and period."""
    query = db.query(PayrollEntry)
    
    if year:
        query = query.join(PayrollPeriod).filter(PayrollPeriod.year == year)
    if period:
        query = query.join(PayrollPeriod).filter(PayrollPeriod.period_number == period)
    
    if "admin" not in current_user["roles"] and "boekhouding" not in current_user["roles"]:
        query = query.filter(PayrollEntry.employee_id == current_user["username"])
    
    return query.all()

@router.post("/verloning/", response_model=PayrollEntryResponse)
async def create_payroll_entry_endpoint(
    entry: PayrollEntryBase,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["admin", "boekhouding"]))
):
    """Create a new payroll entry."""
    try:
        return create_payroll_entry(
            db=db,
            employee_id=entry.employee_id,
            period_id=entry.period_id,
            base_salary=entry.base_salary,
            phone_allowance=entry.phone_allowance,
            meal_allowance=entry.meal_allowance,
            travel_allowance=entry.travel_allowance
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/verloning/upload")
async def upload_payroll_document(
    employee_id: str,
    file: UploadFile = File(...),
    document_type: str = "payslip",
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["admin", "boekhouding"]))
):
    """Upload a payroll document for an employee."""
    # Create upload directory if it doesn't exist
    upload_dir = Path("uploads/payroll")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Save the file
    file_path = upload_dir / f"{employee_id}_{file.filename}"
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Create database entry
    document = PayrollDocument(
        employee_id=employee_id,
        filename=file.filename,
        file_path=str(file_path),
        uploaded_by=current_user["username"],
        document_type=document_type,
        status="active"
    )
    
    db.add(document)
    db.commit()
    
    return {"message": "File uploaded successfully", "filename": file.filename}

@router.get("/verloning/download/{employee_id}/{filename}")
async def download_payroll_document(
    employee_id: str,
    filename: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Download a payroll document."""
    if ("admin" not in current_user["roles"] and 
        "boekhouding" not in current_user["roles"] and 
        employee_id != current_user["username"]):
        raise HTTPException(status_code=403, detail="Not authorized to download this document")
    
    document = db.query(PayrollDocument).filter(
        PayrollDocument.employee_id == employee_id,
        PayrollDocument.filename == filename
    ).first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_path = Path(document.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        filename=filename,
        media_type="application/octet-stream"
    ) 