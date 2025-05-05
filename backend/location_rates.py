from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import LocationRate, LocationRateCreate, LocationRatePydantic
from auth import require_roles, get_current_user
from typing import List
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/location-rates",
    tags=["location-rates"]
)

@router.get("", response_model=List[LocationRatePydantic])
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

@router.post("", response_model=LocationRatePydantic)
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

@router.delete("/{rate_id}")
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