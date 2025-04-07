from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import List, Optional
from auth import require_roles

router = APIRouter(
    prefix="/auto_approval",
    tags=["auto_approval"]
)

class AutoApprovalSetting(BaseModel):
    id: int = 0  # Wordt automatisch ingesteld bij creatie
    employee_id: int
    location: str
    auto_approve: bool  # True = automatische goedkeuring is ingeschakeld

fake_auto_approval_db: List[dict] = []
next_auto_approval_id = 1

@router.get("/", response_model=List[AutoApprovalSetting])
async def get_auto_approval_settings(
    employee_id: Optional[int] = Query(None),
    location: Optional[str] = Query(None),
    current_user: dict = Depends(require_roles(["planner", "admin"]))
):
    settings = fake_auto_approval_db
    if employee_id is not None:
        settings = [s for s in settings if s["employee_id"] == employee_id]
    if location is not None:
        settings = [s for s in settings if s["location"].lower() == location.lower()]
    return settings

@router.get("/{setting_id}", response_model=AutoApprovalSetting)
async def get_auto_approval_setting(setting_id: int, current_user: dict = Depends(require_roles(["planner", "admin"]))):
    for setting in fake_auto_approval_db:
        if setting["id"] == setting_id:
            return setting
    raise HTTPException(status_code=404, detail="Setting not found")

@router.post("/", response_model=AutoApprovalSetting, status_code=201)
async def create_auto_approval_setting(setting: AutoApprovalSetting, current_user: dict = Depends(require_roles(["planner", "admin"]))):
    global next_auto_approval_id
    setting.id = len(fake_auto_approval_db) + 1
    fake_auto_approval_db.append(setting.dict())
    return setting

@router.put("/{setting_id}", response_model=AutoApprovalSetting)
async def update_auto_approval_setting(setting_id: int, setting: AutoApprovalSetting, current_user: dict = Depends(require_roles(["planner", "admin"]))):
    for index, existing_setting in enumerate(fake_auto_approval_db):
        if existing_setting["id"] == setting_id:
            setting.id = setting_id
            fake_auto_approval_db[index] = setting.dict()
            return setting
    raise HTTPException(status_code=404, detail="Setting not found")

@router.delete("/{setting_id}", response_model=AutoApprovalSetting)
async def delete_auto_approval_setting(setting_id: int, current_user: dict = Depends(require_roles(["planner", "admin"]))):
    for index, setting in enumerate(fake_auto_approval_db):
        if setting["id"] == setting_id:
            return fake_auto_approval_db.pop(index)
    raise HTTPException(status_code=404, detail="Setting not found")
