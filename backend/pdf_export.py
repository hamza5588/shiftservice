from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from facturatie import fake_facturen_db
from auth import require_roles
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
import io

router = APIRouter(
    prefix="/pdf-export",
    tags=["pdf-export"]
)


@router.get("/facturen")
async def export_facturen_pdf(current_user: dict = Depends(require_roles(["boekhouding", "admin", "planner"]))):
    if not fake_facturen_db:
        raise HTTPException(status_code=404, detail="Geen facturen gevonden om te exporteren")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    styles = getSampleStyleSheet()
    elements = []

    elements.append(Paragraph("Factuuroverzicht", styles['Title']))
    elements.append(Spacer(1, 12))

    for factuur in fake_facturen_db:
        factuur_text = factuur.get("factuur_text", "").replace("\n", "<br/>")
        text = (
            "Factuur ID: {}<br/>"
            "Opdrachtgever ID: {}<br/>"
            "Locatie: {}<br/>"
            "Factuurdatum: {}<br/>"
            "Bedrag incl. BTW: €{:.2f}<br/>"
            "Status: {}<br/><br/>"
            "Factuur details:<br/>{}<br/><br/>"
        ).format(
            factuur.get("id"),
            factuur.get("opdrachtgever_id"),
            factuur.get("locatie"),
            factuur.get("factuurdatum"),
            factuur.get("bedrag"),
            factuur.get("status"),
            factuur_text
        )
        elements.append(Paragraph(text, styles['Normal']))
        elements.append(Spacer(1, 12))

    doc.build(elements)
    buffer.seek(0)
    return StreamingResponse(buffer, media_type="application/pdf",
                             headers={"Content-Disposition": "attachment;filename=facturen.pdf"})
