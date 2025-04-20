from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
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
from database import get_db
from models import Factuur, Opdrachtgever, LocationRate, LocationRateCreate, LocationRatePydantic
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/facturen",
    tags=["facturen"]
)

UPLOAD_FOLDER = "uploaded_facturen"

# Ensure the upload folder exists
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

class FactuurBase(BaseModel):
    id: Optional[int] = None
    opdrachtgever_id: int
    opdrachtgever_naam: str
    factuurnummer: Optional[str] = None
    locatie: str
    factuurdatum: date
    shift_date: date
    shift_date_end: date
    bedrag: float
    status: str = "open"
    factuur_text: Optional[str] = None
    kvk_nummer: Optional[str] = None
    adres: Optional[str] = None
    postcode: Optional[str] = None
    stad: Optional[str] = None
    telefoon: Optional[str] = None
    email: Optional[str] = None

    class Config:
        orm_mode = True

@router.get("/", response_model=List[FactuurBase])
async def get_facturen(
    current_user: dict = Depends(require_roles(["boekhouding", "admin", "planner"])),
    db: Session = Depends(get_db)
):
    """Get all invoices."""
    try:
        logger.info("Fetching all invoices")
        facturen = db.query(Factuur).all()
        logger.info(f"Successfully fetched {len(facturen)} invoices")
        return facturen
    except Exception as e:
        logger.error(f"Error fetching invoices: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Error fetching invoices: {str(e)}"
        )

@router.get("/{factuur_id}", response_model=FactuurBase)
async def get_factuur(
    factuur_id: int,
    current_user: dict = Depends(require_roles(["boekhouding", "admin", "planner"])),
    db: Session = Depends(get_db)
):
    """Get a specific invoice by ID."""
    try:
        logger.info(f"Fetching invoice with ID: {factuur_id}")
        factuur = db.query(Factuur).filter(Factuur.id == factuur_id).first()
        if not factuur:
            logger.warning(f"Invoice not found with ID: {factuur_id}")
            raise HTTPException(status_code=404, detail="Factuur niet gevonden")
        return factuur
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching invoice {factuur_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Error fetching invoice")

@router.post("/", response_model=FactuurBase, status_code=201)
async def create_factuur(
    factuur: FactuurBase,
    current_user: dict = Depends(require_roles(["boekhouding", "admin", "planner"])),
    db: Session = Depends(get_db)
):
    """Create a new invoice."""
    try:
        logger.info("Creating new invoice")
        
        # Validate required fields
        if not factuur.opdrachtgever_id:
            raise HTTPException(status_code=400, detail="Opdrachtgever ID is required")
        if not factuur.opdrachtgever_naam:
            raise HTTPException(status_code=400, detail="Opdrachtgever naam is required")
        if not factuur.locatie:
            raise HTTPException(status_code=400, detail="Locatie is required")
        if not factuur.factuurdatum:
            raise HTTPException(status_code=400, detail="Factuurdatum is required")
        if not factuur.bedrag or factuur.bedrag <= 0:
            raise HTTPException(status_code=400, detail="Bedrag moet groter zijn dan 0")
        
        # Fetch client information from Opdrachtgever table
        client = db.query(Opdrachtgever).filter(Opdrachtgever.id == factuur.opdrachtgever_id).first()
        if not client:
            raise HTTPException(status_code=404, detail="Opdrachtgever not found")
        
        # Generate invoice number
        factuur_dict = factuur.dict()
        factuur_dict["factuurnummer"] = generate_invoice_number(
            factuur_dict["opdrachtgever_id"],
            factuur_dict["opdrachtgever_naam"],
            db
        )
        
        # Update invoice with client information
        factuur_dict.update({
            "kvk_nummer": client.kvk_nummer,
            "adres": client.adres,
            "postcode": client.postcode,
            "stad": client.stad,
            "telefoon": client.telefoon,
            "email": client.email
        })
        
        # Add client information to factuur_text
        client_info = f"""
FACTUUR AAN:
{client.bedrijfsnaam or client.naam}
KVK: {client.kvk_nummer}
{client.adres}
{client.postcode} {client.stad}
Tel: {client.telefoon}
Email: {client.email}

{factuur_dict.get("factuur_text", "")}
"""
        factuur_dict["factuur_text"] = client_info
        
        # Create new invoice
        db_factuur = Factuur(**factuur_dict)
        db.add(db_factuur)
        db.commit()
        db.refresh(db_factuur)
        
        logger.info(f"Successfully created invoice with ID: {db_factuur.id}")
        return db_factuur
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating invoice: {str(e)}")
        db.rollback()
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

@router.delete("/{factuur_id}", response_model=FactuurBase)
async def delete_factuur(
    factuur_id: int,
    current_user: dict = Depends(require_roles(["boekhouding", "admin"])),
    db: Session = Depends(get_db)
):
    """Delete an invoice."""
    try:
        logger.info(f"Deleting invoice with ID: {factuur_id}")
        db_factuur = db.query(Factuur).filter(Factuur.id == factuur_id).first()
        if not db_factuur:
            logger.warning(f"Invoice not found with ID: {factuur_id}")
            raise HTTPException(status_code=404, detail="Factuur niet gevonden")
        
        db.delete(db_factuur)
        db.commit()
        
        logger.info(f"Successfully deleted invoice with ID: {factuur_id}")
        return db_factuur
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting invoice {factuur_id}: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail="Error deleting invoice")

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
    p.drawString(50, height - 90, factuur.factuurdatum.strftime("%d-%m-%Y"))
    p.drawString(50, height - 110, "")
    p.drawString(50, height - 130, "FACTUURNUMMER")
    p.drawString(50, height - 150, factuur.factuurnummer)
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
    p.drawString(50, height - 350, factuur.opdrachtgever_naam)
    p.drawString(50, height - 370, f"KVK: {factuur.kvk_nummer}")
    p.drawString(50, height - 390, factuur.adres)
    p.drawString(50, height - 410, f"{factuur.postcode} {factuur.stad}")
    p.drawString(50, height - 430, f"Tel: {factuur.telefoon}")
    p.drawString(50, height - 450, f"Email: {factuur.email}")
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
    lines = factuur.factuur_text.split('\n')
    y = height - 510
    total_amount = 0
    
    # Skip the client information part
    shift_lines = [line for line in lines if line.strip() and not any(x in line for x in ["FACTUUR AAN:", "KVK:", "Tel:", "Email:"])]
    
    for line in shift_lines:
        if line.strip():
            # Format: "1.0 islamabad € 24.00 18-04-2025 € 24.80"
            parts = line.split()
            if len(parts) >= 5:
                hours = parts[0]
                location = parts[1]
                rate = parts[2] + " " + parts[3]
                date = parts[4]
                total = parts[5] + " " + parts[6]
                
                p.drawString(50, y, hours)
                p.drawString(150, y, location)
                p.drawString(300, y, rate)
                p.drawString(400, y, date)
                p.drawString(500, y, total)
                
                try:
                    total_amount += float(parts[6])
                except (ValueError, IndexError):
                    pass
                
                y -= 20
    
    # Add subtotal
    y -= 20
    p.drawString(400, y, "Subtotaal")
    p.drawString(500, y, f"€ {factuur.bedrag:.2f}")
    
    # Add BTW
    y -= 20
    btw = factuur.bedrag * 0.21
    p.drawString(400, y, "Btw (21%)")
    p.drawString(500, y, f"€ {btw:.2f}")
    
    # Add total
    y -= 20
    p.setFont("Helvetica-Bold", 10)
    p.drawString(400, y, "Totaal")
    p.drawString(500, y, f"€ {(factuur.bedrag + btw):.2f}")
    
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

@router.get("/location-rates/", response_model=List[LocationRatePydantic])
async def get_location_rates(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["admin"]))
):
    try:
        # Query rates with location relationship
        rates = db.query(LocationRate).options(joinedload(LocationRate.location)).all()
        
        if not rates:
            return []
        
        # Convert to dict and handle the location relationship
        result = []
        for rate in rates:
            try:
                rate_dict = {
                    "id": int(rate.id),
                    "location_id": int(rate.location_id),
                    "pass_type": str(rate.pass_type),
                    "base_rate": float(rate.base_rate) if rate.base_rate is not None else 0.0,
                    "evening_rate": float(rate.evening_rate) if rate.evening_rate is not None else 0.0,
                    "night_rate": float(rate.night_rate) if rate.night_rate is not None else 0.0,
                    "weekend_rate": float(rate.weekend_rate) if rate.weekend_rate is not None else 0.0,
                    "holiday_rate": float(rate.holiday_rate) if rate.holiday_rate is not None else 0.0,
                    "new_years_eve_rate": float(rate.new_years_eve_rate) if rate.new_years_eve_rate is not None else 0.0,
                    "created_at": rate.created_at.isoformat() if rate.created_at else None,
                    "updated_at": rate.updated_at.isoformat() if rate.updated_at else None,
                    "location": {
                        "id": int(rate.location.id),
                        "naam": str(rate.location.naam)
                    } if rate.location else None
                }
                result.append(rate_dict)
            except Exception as e:
                print(f"Error processing rate {rate.id}: {str(e)}")
                continue
        
        return result
    except Exception as e:
        print(f"Error in get_location_rates: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch location rates: {str(e)}")

@router.post("/location-rates", response_model=LocationRatePydantic)
async def create_location_rate(
    rate: LocationRateCreate,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        if not current_user:
            raise HTTPException(status_code=401, detail="Not authenticated")
            
        # Check if user has admin role
        user_roles = [role.name for role in current_user.roles]
        if 'admin' not in user_roles:
            raise HTTPException(status_code=403, detail="Access denied. Admin privileges required.")
        
        # Validate rate multipliers
        base_rate = rate.base_rate
        if rate.evening_rate != base_rate * 1.1:
            raise HTTPException(status_code=400, detail="Evening rate must be 10% higher than base rate")
        if rate.night_rate != base_rate * 1.2:
            raise HTTPException(status_code=400, detail="Night rate must be 20% higher than base rate")
        if rate.weekend_rate != base_rate * 1.35:
            raise HTTPException(status_code=400, detail="Weekend rate must be 35% higher than base rate")
        if rate.holiday_rate != base_rate * 1.5:
            raise HTTPException(status_code=400, detail="Holiday rate must be 50% higher than base rate")
        if rate.new_years_eve_rate != base_rate * 2:
            raise HTTPException(status_code=400, detail="New Year's Eve rate must be 100% higher than base rate")
        
        # Create new rate
        db_rate = LocationRate(
            location_id=rate.location_id,
            pass_type=rate.pass_type,
            base_rate=rate.base_rate,
            evening_rate=rate.evening_rate,
            night_rate=rate.night_rate,
            weekend_rate=rate.weekend_rate,
            holiday_rate=rate.holiday_rate,
            new_years_eve_rate=rate.new_years_eve_rate,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(db_rate)
        db.commit()
        db.refresh(db_rate)
        
        # Convert to dict and include location
        rate_dict = {
            "id": db_rate.id,
            "location_id": db_rate.location_id,
            "pass_type": db_rate.pass_type,
            "base_rate": db_rate.base_rate,
            "evening_rate": db_rate.evening_rate,
            "night_rate": db_rate.night_rate,
            "weekend_rate": db_rate.weekend_rate,
            "holiday_rate": db_rate.holiday_rate,
            "new_years_eve_rate": db_rate.new_years_eve_rate,
            "created_at": db_rate.created_at.isoformat(),
            "updated_at": db_rate.updated_at.isoformat(),
            "location": {
                "id": db_rate.location.id,
                "opdrachtgever_id": db_rate.location.opdrachtgever_id,
                "naam": db_rate.location.naam,
                "adres": db_rate.location.adres,
                "stad": db_rate.location.stad,
                "postcode": db_rate.location.postcode,
                "provincie": db_rate.location.provincie,
                "email": db_rate.location.email
            } if db_rate.location else None
        }
        
        return rate_dict
    except Exception as e:
        print(f"Error creating location rate: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create location rate: {str(e)}")

@router.delete("/location-rates/{rate_id}")
async def delete_location_rate(
    rate_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    try:
        if not current_user or not any(role.name == 'admin' for role in current_user.roles):
            raise HTTPException(status_code=403, detail="Access denied")
        
        rate = db.query(LocationRate).filter(LocationRate.id == rate_id).first()
        if not rate:
            raise HTTPException(status_code=404, detail="Rate not found")
        
        db.delete(rate)
        db.commit()
        return {"message": "Rate deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting location rate: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete location rate")

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
