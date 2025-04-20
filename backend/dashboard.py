from fastapi import APIRouter, Depends, HTTPException
from auth import require_roles, get_current_user
from planning import fake_shifts_db
from dienstaanvragen import router as dienstaanvragen_router
from datetime import datetime, date
from scheduler import calculate_shift_hours
from employee_profiles import get_employee_profile
from verloning import get_payroll
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from database import get_db
from sqlalchemy.orm import Session
from models import Dienstaanvraag, Factuur

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"]
)

class EmployeeDashboardResponse(BaseModel):
    shifts: List[Dict[str, Any]]
    service_requests: List[Dict[str, Any]]
    payroll: Dict[str, Any]
    profile: Dict[str, Any]

@router.get("/")
async def get_dashboard(
    current_user: dict = Depends(require_roles(["planner", "admin"])),
    db: Session = Depends(get_db)
):
    shift_stats = {}
    total_shift_hours = 0.0
    for shift in fake_shifts_db:
        status = shift.get("status", "unknown")
        shift_stats[status] = shift_stats.get(status, 0) + 1
        try:
            day_hours, evening_hours, night_hours = calculate_shift_hours(shift["start_time"], shift["end_time"])
            total_shift_hours += (day_hours + evening_hours + night_hours)
        except Exception as e:
            print("Fout bij urenberekening voor shift {}: {}".format(shift.get("id"), e))
            continue

    aanvraag_stats = {}
    dienstaanvragen = db.query(Dienstaanvraag).all()
    for aanvraag in dienstaanvragen:
        status = aanvraag.status or "unknown"
        aanvraag_stats[status] = aanvraag_stats.get(status, 0) + 1

    factuur_stats = {}
    total_factuur_amount = 0.0
    facturen = db.query(Factuur).all()
    for factuur in facturen:
        status = factuur.status or "unknown"
        factuur_stats[status] = factuur_stats.get(status, 0) + 1
        try:
            total_factuur_amount += float(factuur.bedrag)
        except Exception as e:
            print("Fout bij factuur bedrag voor factuur {}: {}".format(factuur.id, e))
            continue

    dashboard_data = {
        "total_shifts": len(fake_shifts_db),
        "shift_stats": shift_stats,
        "total_shift_hours": total_shift_hours,
        "total_dienstaanvragen": len(dienstaanvragen),
        "dienstaanvraag_stats": aanvraag_stats,
        "total_facturen": len(facturen),
        "factuur_stats": factuur_stats,
        "total_factuur_amount": total_factuur_amount,
        "timestamp": datetime.now().isoformat()
    }
    return dashboard_data

@router.get("/employee", response_model=EmployeeDashboardResponse)
async def get_employee_dashboard(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get employee dashboard data including:
    1. My Shifts (Upcoming & Past)
    2. My Service Requests
    3. My Payroll Overview
    4. My Profile
    """
    try:
        # 1. Get employee's shifts
        employee_shifts = [
            shift for shift in fake_shifts_db 
            if current_user["username"] in shift.get("employee_ids", [])
        ]
        
        # 2. Get employee's service requests
        employee_requests = db.query(Dienstaanvraag).filter(
            Dienstaanvraag.employee_id == current_user["username"]
        ).all()
        
        # 3. Get employee's payroll data
        current_year = date.today().year
        payroll_data = await get_payroll(year=current_year)
        employee_payroll = next(
            (entry for entry in payroll_data if entry["employee_id"] == current_user["username"]),
            {}
        )
        
        # 4. Get employee's profile
        employee_profile = await get_employee_profile(current_user)
        
        return EmployeeDashboardResponse(
            shifts=employee_shifts,
            service_requests=employee_requests,
            payroll=employee_payroll,
            profile=employee_profile
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching dashboard data: {str(e)}")
