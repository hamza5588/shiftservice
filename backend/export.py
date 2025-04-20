from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from database import get_db
from models import Factuur
import io
from openpyxl import Workbook

router = APIRouter(
    prefix="/export",
    tags=["export"]
)


@router.get("/facturen")
async def export_facturen(db: Session = Depends(get_db)):
    """
    Exporteer alle facturen naar een Excel-bestand.
    """
    # Get all invoices from database
    facturen = db.query(Factuur).all()
    
    if not facturen:
        raise HTTPException(status_code=404, detail="Geen facturen gevonden om te exporteren")

    # Maak een nieuw Excel-werkboek en activeer het eerste blad
    wb = Workbook()
    ws = wb.active
    ws.title = "Facturen"

    # Schrijf de header
    headers = ["ID", "Locatie", "Factuurdatum", "Bedrag", "Status"]
    ws.append(headers)

    # Schrijf de factuurgegevens
    for factuur in facturen:
        ws.append([
            factuur.id,
            factuur.locatie,
            factuur.factuurdatum.strftime("%Y-%m-%d") if factuur.factuurdatum else "",
            factuur.bedrag,
            factuur.status
        ])

    # Sla het werkboek op in een in-memory bytes-buffer
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=facturen.xlsx"}
    )
