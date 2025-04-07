from fastapi import APIRouter, Depends, Query
from typing import List, Dict, Any, Optional
from datetime import date
from planning import fake_shifts_db
from auth import get_current_user

router = APIRouter(
    prefix="/agenda",
    tags=["agenda"]
)


@router.get("/")
async def get_agenda(
        start_date: Optional[date] = Query(None, description="Filter op startdatum"),
        end_date: Optional[date] = Query(None, description="Filter op einddatum"),
        current_user: dict = Depends(get_current_user)
) -> Dict[str, List[Any]]:
    """
    Geeft een agenda overzicht van shifts, gegroepeerd per status (approved, pending, rejected).
    Optioneel kun je filteren op een bepaalde periode.
    """
    agenda = {
        "approved": [],
        "pending": [],
        "rejected": []
    }

    for shift in fake_shifts_db:
        # Zorg dat de shift_date als een date-object beschikbaar is
        shift_date = shift.get("shift_date")
        if isinstance(shift_date, str):
            shift_date = date.fromisoformat(shift_date)
        if start_date and shift_date < start_date:
            continue
        if end_date and shift_date > end_date:
            continue

        status = shift.get("status", "pending")
        if status not in agenda:
            agenda[status] = []
        agenda[status].append(shift)

    return agenda
