from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from auth import require_roles
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from database import get_db
from sqlalchemy.orm import Session
from models import Factuur
import io
import logging

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/pdf-export",
    tags=["pdf-export"]
)

@router.get("/facturen")
async def export_facturen_pdf(
    current_user: dict = Depends(require_roles(["boekhouding", "admin", "planner"])),
    db: Session = Depends(get_db)
):
    """Export all invoices as PDF."""
    try:
        logger.info("Starting PDF export of invoices")
        facturen = db.query(Factuur).all()
        if not facturen:
            logger.warning("No invoices found to export")
            raise HTTPException(status_code=404, detail="Geen facturen gevonden om te exporteren")

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4)
        styles = getSampleStyleSheet()
        elements = []

        elements.append(Paragraph("Factuuroverzicht", styles['Title']))
        elements.append(Spacer(1, 12))

        for factuur in facturen:
            factuur_text = factuur.factuur_text.replace("\n", "<br/>") if factuur.factuur_text else ""
            text = (
                "Factuur ID: {}<br/>"
                "Opdrachtgever ID: {}<br/>"
                "Locatie: {}<br/>"
                "Factuurdatum: {}<br/>"
                "Bedrag incl. BTW: €{:.2f}<br/>"
                "Status: {}<br/><br/>"
                "Factuur details:<br/>{}<br/><br/>"
            ).format(
                factuur.id,
                factuur.opdrachtgever_id,
                factuur.locatie,
                factuur.factuurdatum,
                factuur.bedrag,
                factuur.status,
                factuur_text
            )
            elements.append(Paragraph(text, styles['Normal']))
            elements.append(Spacer(1, 12))

        doc.build(elements)
        buffer.seek(0)
        
        logger.info("Successfully generated PDF export")
        return StreamingResponse(buffer, media_type="application/pdf",
                             headers={"Content-Disposition": "attachment;filename=facturen.pdf"})
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting invoices to PDF: {str(e)}")
        raise HTTPException(status_code=500, detail="Error exporting invoices to PDF")
