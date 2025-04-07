from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from facturatie import fake_facturen_db
import io
from openpyxl import Workbook

router = APIRouter(
    prefix="/export",
    tags=["export"]
)


@router.get("/facturen")
async def export_facturen():
    """
    Exporteer alle facturen naar een Excel-bestand.
    """
    if not fake_facturen_db:
        raise HTTPException(status_code=404, detail="Geen facturen gevonden om te exporteren")

    # Maak een nieuw Excel-werkboek en activeer het eerste blad
    wb = Workbook()
    ws = wb.active
    ws.title = "Facturen"

    # Schrijf de header
    headers = ["ID", "Locatie", "Factuurdatum", "Bedrag", "Status"]
    ws.append(headers)

    # Schrijf de factuurgegevens
    for factuur in fake_facturen_db:
        ws.append([
            factuur.get("id"),
            factuur.get("locatie"),
            str(factuur.get("factuurdatum")),
            factuur.get("bedrag"),
            factuur.get("status")
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
