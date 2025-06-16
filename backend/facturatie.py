from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel, ConfigDict
from typing import List, Optional
from datetime import date, datetime
import os
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import Table, TableStyle
from auth import require_roles, get_current_user
from io import BytesIO
from sqlalchemy.orm import Session, joinedload
from email_config import EMAIL_CONFIG, send_invoice_email
from database import get_db
from models import Factuur, Opdrachtgever, Shift
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
import logging
import sys
from sqlalchemy import and_, or_

# Create logs directory if it doesn't exist
log_dir = os.path.join(os.path.dirname(__file__), 'logs')
os.makedirs(log_dir, exist_ok=True)

# Configure logging with both file and console handlers
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Create file handler for invoice logs
invoice_log_file = os.path.join(log_dir, 'invoice.log')
file_handler = logging.FileHandler(invoice_log_file)
file_handler.setLevel(logging.DEBUG)

# Create console handler
console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.INFO)

# Create formatters and add them to handlers
log_format = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
file_handler.setFormatter(log_format)
console_handler.setFormatter(log_format)

# Add handlers to logger
logger.addHandler(file_handler)
logger.addHandler(console_handler)

# Create router for facturen
router = APIRouter(
    prefix="/facturen",
    tags=["facturen"]
)

UPLOAD_FOLDER = "uploaded_facturen"

# Ensure the upload folder exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

class FactuurBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: Optional[int] = None
    opdrachtgever_id: int
    opdrachtgever_naam: Optional[str] = None
    factuurnummer: Optional[str] = None
    locatie: Optional[str] = None
    factuurdatum: Optional[date] = None
    shift_date: Optional[date] = None
    shift_date_end: Optional[date] = None
    bedrag: Optional[float] = None
    status: Optional[str] = "open"
    factuur_text: Optional[str] = None
    kvk_nummer: Optional[str] = None
    adres: Optional[str] = None
    postcode: Optional[str] = None
    stad: Optional[str] = None
    telefoon: Optional[str] = None
    email: Optional[str] = None
    client_name: Optional[str] = None
    issue_date: Optional[date] = None
    due_date: Optional[date] = None
    total_amount: Optional[float] = None
    vat_amount: Optional[float] = None
    subtotal: Optional[float] = None
    breakdown: Optional[dict] = None

@router.get("/")
async def get_facturen(
    current_user: dict = Depends(require_roles(["boekhouding", "admin", "planner"])),
    db: Session = Depends(get_db)
):
    """Get all invoices."""
    try:
        logger.info("Fetching all invoices")
        facturen = db.query(Factuur).all()
        logger.info(f"Successfully fetched {len(facturen)} invoices")
        
        # Transform the data into a list of dictionaries
        facturen_list = []
        for factuur in facturen:
            factuur_dict = {
                "id": factuur.id,
                "opdrachtgever_id": factuur.opdrachtgever_id,
                "opdrachtgever_naam": factuur.opdrachtgever_naam or "",
                "factuurnummer": factuur.factuurnummer or "",
                "locatie": factuur.locatie or "",
                "factuurdatum": factuur.factuurdatum or date.today(),
                "shift_date": factuur.shift_date or date.today(),
                "shift_date_end": factuur.shift_date_end or date.today(),
                "bedrag": factuur.bedrag or 0.0,
                "status": factuur.status or "open",
                "factuur_text": factuur.factuur_text or "",
                "kvk_nummer": factuur.kvk_nummer or "",
                "adres": factuur.adres or "",
                "postcode": factuur.postcode or "",
                "stad": factuur.stad or "",
                "telefoon": factuur.telefoon or "",
                "email": factuur.email or ""
            }
            facturen_list.append(factuur_dict)
        
        return facturen_list
    except Exception as e:
        logger.error(f"Error fetching invoices: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Error fetching invoices: {str(e)}"
        )

@router.get("/{invoice_id}")
async def get_factuur(
    invoice_id: int,
    current_user: dict = Depends(require_roles(["boekhouding", "admin", "planner"])),
    db: Session = Depends(get_db)
):
    """Get a specific invoice by ID."""
    try:
        logger.info(f"Fetching invoice with ID: {invoice_id}")
        factuur = db.query(Factuur).filter(Factuur.id == invoice_id).first()
        
        if not factuur:
            logger.warning(f"Invoice not found with ID: {invoice_id}")
            raise HTTPException(
                status_code=404,
                detail=f"Invoice not found with ID: {invoice_id}"
            )
        
        logger.info(f"Successfully fetched invoice with ID: {invoice_id}")
        
        # Transform the data into a dictionary
        factuur_dict = {
            "id": factuur.id,
            "opdrachtgever_id": factuur.opdrachtgever_id,
            "opdrachtgever_naam": factuur.opdrachtgever_naam or "",
            "factuurnummer": factuur.factuurnummer or "",
            "locatie": factuur.locatie or "",
            "factuurdatum": factuur.factuurdatum or date.today(),
            "shift_date": factuur.shift_date or date.today(),
            "shift_date_end": factuur.shift_date_end or date.today(),
            "bedrag": factuur.bedrag or 0.0,
            "status": factuur.status or "open",
            "factuur_text": factuur.factuur_text or "",
            "kvk_nummer": factuur.kvk_nummer or "",
            "adres": factuur.adres or "",
            "postcode": factuur.postcode or "",
            "stad": factuur.stad or "",
            "telefoon": factuur.telefoon or "",
            "email": factuur.email or ""
        }
        
        return factuur_dict
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching invoice with ID {invoice_id}: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching invoice: {str(e)}"
        )

@router.post("/", response_model=FactuurBase, status_code=201)
async def create_factuur(
    factuur: FactuurBase,
    current_user: dict = Depends(require_roles(["boekhouding", "admin", "planner"])),
    db: Session = Depends(get_db)
):
    """Create a new invoice."""
    try:
        logger.info("Creating new invoice")
        logger.info(f"Received invoice data: {factuur.dict()}")
        
        # Validate required fields
        if not factuur.opdrachtgever_id:
            raise HTTPException(status_code=400, detail="Opdrachtgever ID is required")
        if not factuur.opdrachtgever_naam:
            raise HTTPException(status_code=400, detail="Opdrachtgever naam is required")
        if not factuur.locatie:
            raise HTTPException(status_code=400, detail="Locatie is required")
        if not factuur.factuurdatum:
            raise HTTPException(status_code=400, detail="Factuurdatum is required")
        if not factuur.bedrag:
            raise HTTPException(status_code=400, detail="Bedrag is required")
        if not factuur.shift_date:
            raise HTTPException(status_code=400, detail="Shift date is required")
        if not factuur.shift_date_end:
            raise HTTPException(status_code=400, detail="Shift date end is required")
        if not factuur.subtotal:
            raise HTTPException(status_code=400, detail="Subtotal is required")
        if not factuur.vat_amount:
            raise HTTPException(status_code=400, detail="VAT amount is required")
        if not factuur.total_amount:
            raise HTTPException(status_code=400, detail="Total amount is required")
        if not factuur.breakdown:
            raise HTTPException(status_code=400, detail="Breakdown is required")
        if not factuur.issue_date:
            raise HTTPException(status_code=400, detail="Issue date is required")
        if not factuur.due_date:
            raise HTTPException(status_code=400, detail="Due date is required")

        # Get client information
        client = db.query(Opdrachtgever).filter(Opdrachtgever.id == factuur.opdrachtgever_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")

        # Generate invoice number
        try:
            factuurnummer = generate_invoice_number(factuur.opdrachtgever_id, factuur.opdrachtgever_naam, db)
        except Exception as e:
            logger.error(f"Error generating invoice number: {str(e)}")
            raise HTTPException(status_code=500, detail="Error generating invoice number")

        # Create new invoice
        new_factuur = Factuur(
            opdrachtgever_id=factuur.opdrachtgever_id,
            opdrachtgever_naam=factuur.opdrachtgever_naam,
            factuurnummer=factuurnummer,
            locatie=factuur.locatie,
            factuurdatum=factuur.factuurdatum,
            shift_date=factuur.shift_date,
            shift_date_end=factuur.shift_date_end,
            bedrag=factuur.bedrag,
            status=factuur.status or "open",
            factuur_text=factuur.factuur_text,
            kvk_nummer=factuur.kvk_nummer,
            adres=factuur.adres,
            postcode=factuur.postcode,
            stad=factuur.stad,
            telefoon=factuur.telefoon,
            email=factuur.email,
            client_name=factuur.client_name,
            issue_date=factuur.issue_date,
            due_date=factuur.due_date,
            total_amount=factuur.total_amount,
            vat_amount=factuur.vat_amount,
            subtotal=factuur.subtotal,
            breakdown=factuur.breakdown
        )

        # Add to database
        try:
            db.add(new_factuur)
            db.commit()
            db.refresh(new_factuur)
            logger.info(f"Successfully created invoice with ID: {new_factuur.id}")
            return new_factuur
        except Exception as e:
            db.rollback()
            logger.error(f"Database error creating invoice: {str(e)}")
            raise HTTPException(status_code=500, detail="Database error creating invoice")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating invoice: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error creating invoice: {str(e)}")

@router.put("/{factuur_id}", response_model=FactuurBase)
async def update_factuur(
    factuur_id: int,
    factuur: FactuurBase,
    current_user: dict = Depends(require_roles(["boekhouding", "admin", "planner"])),
    db: Session = Depends(get_db)
):
    """Update an existing invoice."""
    try:
        logger.info(f"Updating invoice with ID: {factuur_id}")
        db_factuur = db.query(Factuur).filter(Factuur.id == factuur_id).first()
        if not db_factuur:
            logger.warning(f"Invoice not found with ID: {factuur_id}")
            raise HTTPException(status_code=404, detail="Factuur niet gevonden")
        
        for key, value in factuur.dict().items():
            setattr(db_factuur, key, value)
        
        db.commit()
        db.refresh(db_factuur)
        
        logger.info(f"Successfully updated invoice with ID: {factuur_id}")
        return db_factuur
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating invoice {factuur_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error updating invoice")

@router.delete("/{factuur_id}")
async def delete_factuur(
    factuur_id: int,
    current_user: dict = Depends(require_roles(["admin", "boekhouding"])),
    db: Session = Depends(get_db)
):
    """Delete an invoice."""
    try:
        logger.info(f"Deleting invoice with ID: {factuur_id}")
        db_factuur = db.query(Factuur).filter(Factuur.id == factuur_id).first()
        if not db_factuur:
            logger.warning(f"Invoice not found with ID: {factuur_id}")
            raise HTTPException(status_code=404, detail="Factuur niet gevonden")
        
        # Store the factuurnummer before deleting
        factuurnummer = db_factuur.factuurnummer
        
        # Update any associated shifts to remove the factuur_id reference
        db.query(Shift).filter(Shift.factuur_id == factuur_id).update({Shift.factuur_id: None})
        
        # Now delete the invoice
        db.delete(db_factuur)
        db.commit()
        
        logger.info(f"Successfully deleted invoice with ID: {factuur_id}")
        return {"message": f"Invoice {factuurnummer} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting invoice {factuur_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting invoice: {str(e)}")

def generate_invoice_number(opdrachtgever_id: int, opdrachtgever_naam: str, db: Session) -> str:
    """Generate a unique invoice number in the format [YEAR][CLIENT NUMBER][INVOICE COUNT]-[CLIENT DIGIT]."""
    try:
        # Get current year
        current_year = datetime.now().year
        
        # Pad client ID to 3 digits (one leading zero)
        client_number = str(opdrachtgever_id).zfill(3)
        
        # Get first 3 letters of client name for client digit
        client_digit = opdrachtgever_naam[:3].upper()
        
        # Create the year-client prefix
        year_client_prefix = f"{current_year}{client_number}"
        
        # Find the last invoice for this client in the current year
        last_invoice = db.query(Factuur).filter(
            Factuur.factuurnummer.like(f"{year_client_prefix}%")
        ).order_by(Factuur.factuurnummer.desc()).first()
        
        # Get the next count
        if last_invoice and last_invoice.factuurnummer:
            try:
                # Try to extract count from the format YYYYCCCNNN-DDD
                last_count = int(last_invoice.factuurnummer[7:10])
                next_count = last_count + 1
            except (ValueError, IndexError):
                # If extraction fails, start from 1
                next_count = 1
        else:
            next_count = 1
        
        # Format the invoice number
        invoice_number = f"{year_client_prefix}{next_count:03d}-{client_digit}"
        
        # Verify uniqueness
        while db.query(Factuur).filter(Factuur.factuurnummer == invoice_number).first():
            next_count += 1
            invoice_number = f"{year_client_prefix}{next_count:03d}-{client_digit}"
        
        logger.info(f"Generated invoice number: {invoice_number}")
        return invoice_number
    except Exception as e:
        logger.error(f"Error generating invoice number: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate invoice number: {str(e)}"
        )

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

@router.get("/pdf-export/facturen")
async def export_invoices_pdf(
    current_user: dict = Depends(require_roles(["boekhouding", "admin", "planner"])),
    db: Session = Depends(get_db)
):
    """Export all invoices as PDF."""
    try:
        # Create a buffer to store the PDF
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        elements = []

        # Add header
        elements.append(Paragraph("Factuuroverzicht", styles['Title']))
        elements.append(Spacer(1, 12))

        # Get all invoices from database
        facturen = db.query(Factuur).all()
        
        # Create table data
        data = [["Factuurnummer", "Klant", "Datum", "Bedrag", "Status"]]
        for factuur in facturen:
            data.append([
                factuur.factuurnummer or "-",
                factuur.opdrachtgever_naam or "-",
                factuur.factuurdatum.strftime("%d-%m-%Y") if factuur.factuurdatum else "-",
                f"€{factuur.bedrag:.2f}",
                factuur.status or "-"
            ])

        # Create table
        table = Table(data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('TEXTCOLOR', (0, 1), (-1, -1), colors.black),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 12),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(table)

        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment;filename=facturen.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{factuur_id}/download")
async def download_factuur(
    factuur_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download a single invoice as PDF."""
    try:
        # Find the invoice
        factuur = db.query(Factuur).filter(Factuur.id == factuur_id).first()
        if not factuur:
            raise HTTPException(status_code=404, detail="Factuur niet gevonden")

        # Generate PDF
        pdf_content = generate_pdf(factuur)
        
        return StreamingResponse(
            io.BytesIO(pdf_content),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=factuur_{factuur.factuurnummer or factuur_id}.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def generate_pdf(factuur: FactuurBase) -> bytes:
    try:
        buffer = BytesIO()
        p = canvas.Canvas(buffer)
        
        # Set up the page
        p.setPageSize((595, 842))  # A4 size in points
        width, height = 595, 842
        
        # Add invoice information
        p.setFont("Helvetica-Bold", 14)
        p.drawString(50, height - 50, "FACTUUR")
        p.setFont("Helvetica", 10)
        p.drawString(50, height - 70, "DATUM")
        p.drawString(50, height - 90, factuur.factuurdatum.strftime("%d-%m-%Y") if factuur.factuurdatum else "N/A")
        p.drawString(50, height - 110, "")
        p.drawString(50, height - 130, "FACTUURNUMMER")
        p.drawString(50, height - 150, factuur.factuurnummer or "N/A")
        p.drawString(50, height - 170, "")
        
        # Add company information from configuration
        company_info = {
            "name": "Secufy Security Services",
            "kvk": "94486786",
            "address": "Soetendalseweg 32c",
            "postcode": "3036ER",
            "city": "Rotterdam",
            "phone": "0685455793",
            "email": "vraagje@secufy.nl",
            "bank": "NL11 ABNA 0137 7274"
        }
        
        # Add company information
        p.setFont("Helvetica-Bold", 12)
        p.drawString(50, height - 190, company_info["name"])
        p.setFont("Helvetica", 10)
        p.drawString(50, height - 210, f"KVK: {company_info['kvk']}")
        p.drawString(50, height - 230, company_info["address"])
        p.drawString(50, height - 250, f"{company_info['postcode']} {company_info['city']}")
        p.drawString(50, height - 270, f"Tel: {company_info['phone']}")
        p.drawString(50, height - 290, f"Email: {company_info['email']}")
        p.drawString(50, height - 310, "")
        
        # Add client information
        p.setFont("Helvetica-Bold", 12)
        p.drawString(50, height - 330, "FACTUUR AAN:")
        p.setFont("Helvetica", 10)
        p.drawString(50, height - 350, factuur.opdrachtgever_naam or "N/A")
        p.drawString(50, height - 370, f"KVK: {factuur.kvk_nummer or 'N/A'}")
        p.drawString(50, height - 390, factuur.adres or "N/A")
        p.drawString(50, height - 410, f"{factuur.postcode or 'N/A'} {factuur.stad or 'N/A'}")
        p.drawString(50, height - 430, f"Tel: {factuur.telefoon or 'N/A'}")
        p.drawString(50, height - 450, f"Email: {factuur.email or 'N/A'}")
        p.drawString(50, height - 470, "")
        
        # Add table headers
        p.setFont("Helvetica-Bold", 10)
        p.drawString(50, height - 490, "UREN")
        p.drawString(150, height - 490, "LOCATIE")
        p.drawString(300, height - 490, "TARIEF")
        p.drawString(400, height - 490, "DATUM")
        p.drawString(500, height - 490, "TOTAAL")
        
        # Add table content
        p.setFont("Helvetica", 10)
        # Parse the factuur_text to get shift details
        lines = factuur.factuur_text.split('\n') if factuur.factuur_text else []
        y = height - 510
        total_amount = 0
        
        # Skip the client information part
        shift_lines = [line for line in lines if line.strip() and not any(x in line for x in ["FACTUUR AAN:", "KVK:", "Tel:", "Email:", "FACTUUR", "DATUM", "FACTUURNUMMER", "SECUFY", "BEDANKT"])]
        
        # Draw a line under the headers
        p.line(50, height - 495, 545, height - 495)
        
        for line in shift_lines:
            if line.strip():
                try:
                    # Format: "UREN\tLOCATIE\tTARIEF\tDATUM\tTOTAAL"
                    parts = line.split('\t') # Split by tab
                    
                    if len(parts) == 5:  # Expect 5 parts: hours, location, rate, date, total
                        hours_str = parts[0]
                        location_name = parts[1]
                        rate_str = parts[2]
                        date_str = parts[3]
                        total_str = parts[4]
                        
                        # Clean and convert numeric values
                        hours = float(hours_str.replace(',', '.'))
                        # Remove currency symbol and replace comma with dot for rate and total
                        rate = float(rate_str.replace('€', '').replace(',', '.').strip())
                        total = float(total_str.replace('€', '').replace(',', '.').strip())
                        
                        # Draw a line between rows
                        p.line(50, y + 5, 545, y + 5)
                        
                        p.drawString(50, y, hours_str)
                        p.drawString(150, y, location_name)
                        p.drawString(300, y, rate_str)
                        p.drawString(400, y, date_str)
                        p.drawString(500, y, total_str)
                        
                        total_amount += total
                        
                        y -= 20
                    else:
                        logger.warning(f"Invalid line format: {line} (Expected 5 parts, got {len(parts)})")
                except Exception as line_err:
                    logger.error(f"Error processing line: {line}")
                    logger.error(f"Error details: {str(line_err)}")
                    continue
        
        # Draw a line before totals
        p.line(50, y + 5, 545, y + 5)
        
        # Calculate VAT and total
        vat_amount = total_amount * 0.21
        final_total = total_amount + vat_amount
        
        # Add subtotal, BTW, and Total
        y -= 20
        p.drawString(400, y, "Subtotaal")
        p.drawString(500, y, f"€ {total_amount:.2f}")
        
        # Add BTW
        y -= 20
        p.drawString(400, y, "Btw (21%)")
        p.drawString(500, y, f"€ {vat_amount:.2f}")
        
        # Add total
        y -= 20
        p.setFont("Helvetica-Bold", 10)
        p.drawString(400, y, "Totaal")
        p.drawString(500, y, f"€ {final_total:.2f}")
        
        # Add footer
        y -= 40
        p.setFont("Helvetica-Bold", 10)
        p.drawString(50, y, "BEDANKT VOOR UW KLANDIZIE")
        y -= 20
        p.setFont("Helvetica", 10)
        p.drawString(50, y, f"Alle bedragen gelieve over te maken op rekeningnummer {company_info['bank']}")
        
        p.save()
        buffer.seek(0)
        return buffer.getvalue()
    except Exception as e:
        logger.error(f"Error generating PDF: {str(e)}", exc_info=True)
        logger.error(f"Factuur data: {factuur.dict() if hasattr(factuur, 'dict') else str(factuur)}")
        raise Exception(f"PDF generation failed: {str(e)}")

@router.delete("/facturen/nummer/{factuurnummer}", include_in_schema=True)
@router.delete("/api/facturen/nummer/{factuurnummer}", include_in_schema=True)
async def delete_factuur_by_nummer(
    factuurnummer: str,
    current_user: dict = Depends(require_roles(["boekhouding", "admin"])),
    db: Session = Depends(get_db)
):
    """Delete an invoice by its factuurnummer."""
    try:
        logger.info(f"Deleting invoice with factuurnummer: {factuurnummer}")
        db_factuur = db.query(Factuur).filter(Factuur.factuurnummer == factuurnummer).first()
        if not db_factuur:
            logger.warning(f"Invoice not found with factuurnummer: {factuurnummer}")
            raise HTTPException(status_code=404, detail=f"Factuur niet gevonden met nummer: {factuurnummer}")
        
        db.delete(db_factuur)
        db.commit()
        
        logger.info(f"Successfully deleted invoice with factuurnummer: {factuurnummer}")
        return {"message": "Factuur succesvol verwijderd"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting invoice with factuurnummer {factuurnummer}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error deleting invoice: {str(e)}")

@router.get("/nummer/{factuurnummer}", response_model=FactuurBase)
async def get_factuur_by_nummer(
    factuurnummer: str,
    current_user: dict = Depends(require_roles(["boekhouding", "admin", "planner"])),
    db: Session = Depends(get_db)
):
    """Get a specific invoice by factuurnummer."""
    try:
        logger.info(f"Fetching invoice with factuurnummer: {factuurnummer}")
        factuur = db.query(Factuur).filter(Factuur.factuurnummer == factuurnummer).first()
        if not factuur:
            logger.warning(f"Invoice not found with factuurnummer: {factuurnummer}")
            raise HTTPException(status_code=404, detail="Factuur niet gevonden")
        return factuur
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching invoice {factuurnummer}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching invoice")

@router.post("/{factuur_id}/send")
async def send_factuur(
    factuur_id: int,
    current_user: dict = Depends(require_roles(["boekhouding", "admin"])),
    db: Session = Depends(get_db)
):
    """Send an invoice via email."""
    # Create a unique log file for this invoice send attempt
    log_file = os.path.join(log_dir, f'invoice_send_{factuur_id}_{datetime.now().strftime("%Y%m%d_%H%M%S")}.log')
    file_handler = logging.FileHandler(log_file)
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))
    logger.addHandler(file_handler)

    try:
        logger.info("="*50)
        logger.info(f"Starting invoice send process for invoice ID: {factuur_id}")
        logger.info(f"Timestamp: {datetime.now()}")
        logger.info(f"User: {current_user.username if hasattr(current_user, 'username') else 'Unknown'}")
        logger.info("="*50)
        
        # Get invoice
        logger.debug(f"Fetching invoice with ID: {factuur_id}")
        invoice = db.query(Factuur).filter(Factuur.id == factuur_id).first()
        if not invoice:
            logger.error(f"Invoice not found with ID: {factuur_id}")
            raise HTTPException(status_code=404, detail="Invoice not found")
        logger.debug(f"Found invoice: {invoice.factuurnummer}")

        # Check for valid email
        logger.debug(f"Validating invoice email: {invoice.email}")
        if not invoice.email or "@" not in invoice.email:
            logger.error(f"Invoice {factuur_id} has missing or invalid email: {invoice.email}")
            raise HTTPException(status_code=400, detail="Invoice has missing or invalid email address")
        logger.debug("Email validation passed")

        # Generate PDF
        try:
            logger.debug("Generating PDF for invoice")
            pdf_content = generate_pdf(invoice)
            if not pdf_content:
                logger.error("PDF generation returned empty content")
                raise Exception("PDF generation returned empty content")
            logger.debug(f"PDF generated successfully, size: {len(pdf_content)} bytes")
        except Exception as pdf_err:
            logger.error(f"PDF generation failed for invoice {factuur_id}: {str(pdf_err)}", exc_info=True)
            logger.error(f"Error type: {type(pdf_err)}")
            logger.error(f"Error details: {pdf_err.__dict__ if hasattr(pdf_err, '__dict__') else 'No details available'}")
            logger.error(f"Stack trace:", exc_info=True)
            raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(pdf_err)}")

        # Send email
        try:
            # Validate email configuration
            logger.debug("Validating email configuration")
            logger.debug(f"Email config: {EMAIL_CONFIG}")
            if not all([EMAIL_CONFIG['username'], EMAIL_CONFIG['password']]):
                missing = [k for k, v in EMAIL_CONFIG.items() if not v and k in ['username', 'password']]
                logger.error(f"Missing email configuration: {', '.join(missing)}")
                raise Exception(f"Missing email configuration: {', '.join(missing)}")
            logger.debug("Email configuration validation passed")

            logger.info(f"Attempting to send email to {invoice.email}")
            email_sent = send_invoice_email(invoice, pdf_content)
            if not email_sent:
                logger.error("Email sending failed (unknown error)")
                raise Exception("Email sending failed (unknown error)")

            logger.info("Updating invoice status to 'sent'")
            invoice.status = 'sent'
            db.commit()
            logger.info(f"Successfully sent invoice {factuur_id} to {invoice.email}")
            logger.info("="*50)
            return {"message": "Invoice sent successfully"}

        except Exception as email_err:
            logger.error(f"Email sending failed for invoice {factuur_id}: {str(email_err)}", exc_info=True)
            logger.error(f"Error type: {type(email_err)}")
            logger.error(f"Error details: {email_err.__dict__ if hasattr(email_err, '__dict__') else 'No details available'}")
            logger.error(f"Stack trace:", exc_info=True)
            raise HTTPException(status_code=500, detail=f"Email sending failed: {str(email_err)}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending invoice {factuur_id}: {str(e)}", exc_info=True)
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error details: {e.__dict__ if hasattr(e, '__dict__') else 'No details available'}")
        logger.error(f"Stack trace:", exc_info=True)
        logger.error("="*50)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
    finally:
        # Remove the file handler to avoid duplicate logs
        logger.removeHandler(file_handler)
        file_handler.close()

# Export the router
__all__ = ["router"]
