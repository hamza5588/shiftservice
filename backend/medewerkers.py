from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session, joinedload
from database import get_db
from models import Medewerker, User
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from auth import get_current_user
import logging
import re

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/medewerkers",
    tags=["medewerkers"]
)

class MedewerkerBase(BaseModel):
    naam: str
    voornaam: str
    tussenvoegsel: Optional[str] = None
    achternaam: str
    initialen: str
    email: str
    telefoon: Optional[str] = None
    adres: Optional[str] = None
    huisnummer: Optional[str] = None
    huisnummer_toevoeging: Optional[str] = None
    postcode: Optional[str] = None
    stad: Optional[str] = None
    geboortedatum: Optional[datetime] = None
    geboorteplaats: Optional[str] = None
    geslacht: Optional[str] = None
    burgerlijke_staat: Optional[str] = None
    bsn: Optional[str] = None
    nationaliteit: Optional[str] = None
    in_dienst: Optional[datetime] = None
    uit_dienst: Optional[datetime] = None
    pas_type: Optional[str] = None
    pas_nummer: Optional[str] = None
    pas_vervaldatum: Optional[datetime] = None
    pas_foto: Optional[str] = None
    pas_foto_voorzijde: Optional[str] = None
    pas_foto_achterzijde: Optional[str] = None
    contract_type: Optional[str] = None
    contract_uren: Optional[int] = None
    contract_vervaldatum: Optional[datetime] = None
    contract_bestand: Optional[str] = None

class MedewerkerUpdate(MedewerkerBase):
    pass

class EmployeeResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: str
    roles: List[str]
    personeelsnummer: int
    uurloner: bool
    telefoonvergoeding_per_uur: float
    maaltijdvergoeding_per_uur: float
    de_minimis_bonus_per_uur: float
    wkr_toeslag_per_uur: float
    kilometervergoeding: float
    max_km: int
    hourly_allowance: float
    naam: str
    voornaam: Optional[str] = None
    tussenvoegsel: Optional[str] = None
    achternaam: Optional[str] = None
    initialen: Optional[str] = None
    telefoon: Optional[str] = None
    adres: Optional[str] = None
    huisnummer: Optional[str] = None
    huisnummer_toevoeging: Optional[str] = None
    postcode: Optional[str] = None
    stad: Optional[str] = None
    geboortedatum: Optional[datetime] = None
    geboorteplaats: Optional[str] = None
    geslacht: Optional[str] = None
    burgerlijke_staat: Optional[str] = None
    bsn: Optional[str] = None
    nationaliteit: Optional[str] = None
    in_dienst: Optional[datetime] = None
    uit_dienst: Optional[datetime] = None
    pas_type: Optional[str] = None
    pas_nummer: Optional[str] = None
    pas_vervaldatum: Optional[datetime] = None
    pas_foto: Optional[str] = None
    contract_type: Optional[str] = None
    contract_uren: Optional[int] = None
    contract_vervaldatum: Optional[datetime] = None
    contract_bestand: Optional[str] = None

    class Config:
        from_attributes = True

@router.get("/", response_model=List[EmployeeResponse])
async def get_medewerkers(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all employees."""
    try:
        logger.debug("Fetching all employees")
        # Get all medewerkers with their associated users
        medewerkers = db.query(Medewerker).options(
            joinedload(Medewerker.user)
        ).all()
        logger.debug(f"Found {len(medewerkers)} employees")
        
        # Convert to the expected format
        result = []
        for medewerker in medewerkers:
            try:
                if not medewerker.user:
                    logger.warning(f"No user found for medewerker {medewerker.id}")
                    continue
                    
                employee_data = {
                    "id": medewerker.id,
                    "username": medewerker.user.username,
                    "email": medewerker.email,
                    "full_name": medewerker.naam,
                    "roles": [role.name for role in medewerker.user.roles],
                    "personeelsnummer": medewerker.id,
                    "uurloner": medewerker.contract_type == "Uurloner",
                    "telefoonvergoeding_per_uur": 2.0,
                    "maaltijdvergoeding_per_uur": 1.5,
                    "de_minimis_bonus_per_uur": 0.5,
                    "wkr_toeslag_per_uur": 1.0,
                    "kilometervergoeding": 0.23,
                    "max_km": 60,
                    "hourly_allowance": 15.0,
                    "naam": medewerker.naam,
                    "voornaam": medewerker.voornaam,
                    "tussenvoegsel": medewerker.tussenvoegsel,
                    "achternaam": medewerker.achternaam,
                    "initialen": medewerker.initialen,
                    "telefoon": medewerker.telefoon,
                    "adres": medewerker.adres,
                    "huisnummer": medewerker.huisnummer,
                    "huisnummer_toevoeging": medewerker.huisnummer_toevoeging,
                    "postcode": medewerker.postcode,
                    "stad": medewerker.stad,
                    "geboortedatum": medewerker.geboortedatum,
                    "geboorteplaats": medewerker.geboorteplaats,
                    "geslacht": medewerker.geslacht,
                    "burgerlijke_staat": medewerker.burgerlijke_staat,
                    "bsn": medewerker.bsn,
                    "nationaliteit": medewerker.nationaliteit,
                    "in_dienst": medewerker.in_dienst,
                    "uit_dienst": medewerker.uit_dienst,
                    "pas_type": medewerker.pas_type,
                    "pas_nummer": medewerker.pas_nummer,
                    "pas_vervaldatum": medewerker.pas_vervaldatum,
                    "pas_foto": medewerker.pas_foto,
                    "contract_type": medewerker.contract_type,
                    "contract_uren": medewerker.contract_uren,
                    "contract_vervaldatum": medewerker.contract_vervaldatum,
                    "contract_bestand": medewerker.contract_bestand
                }
                result.append(employee_data)
                logger.debug(f"Employee: {medewerker.naam}, {medewerker.email}")
            except Exception as e:
                logger.error(f"Error processing medewerker {medewerker.id}: {str(e)}")
                continue
        
        return result
    except Exception as e:
        logger.error(f"Error fetching employees: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error details: {e.__dict__ if hasattr(e, '__dict__') else 'No details available'}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{medewerker_id}", response_model=EmployeeResponse)
async def get_medewerker(
    medewerker_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get a specific employee by ID."""
    try:
        medewerker = db.query(Medewerker).options(
            joinedload(Medewerker.user)
        ).filter(Medewerker.id == medewerker_id).first()
        
        if not medewerker:
            raise HTTPException(status_code=404, detail="Employee not found")
            
        if not medewerker.user:
            raise HTTPException(status_code=404, detail="User not found for employee")
            
        return EmployeeResponse(
            id=medewerker.id,
            username=medewerker.user.username,
            email=medewerker.email,
            full_name=medewerker.naam,
            roles=[role.name for role in medewerker.user.roles],
            personeelsnummer=medewerker.id,
            uurloner=medewerker.contract_type == "Uurloner",
            telefoonvergoeding_per_uur=2.0,
            maaltijdvergoeding_per_uur=1.5,
            de_minimis_bonus_per_uur=0.5,
            wkr_toeslag_per_uur=1.0,
            kilometervergoeding=0.23,
            max_km=60,
            hourly_allowance=15.0,
            naam=medewerker.naam,
            voornaam=medewerker.voornaam,
            tussenvoegsel=medewerker.tussenvoegsel,
            achternaam=medewerker.achternaam,
            initialen=medewerker.initialen,
            telefoon=medewerker.telefoon,
            adres=medewerker.adres,
            huisnummer=medewerker.huisnummer,
            huisnummer_toevoeging=medewerker.huisnummer_toevoeging,
            postcode=medewerker.postcode,
            stad=medewerker.stad,
            geboortedatum=medewerker.geboortedatum,
            geboorteplaats=medewerker.geboorteplaats,
            geslacht=medewerker.geslacht,
            burgerlijke_staat=medewerker.burgerlijke_staat,
            bsn=medewerker.bsn,
            nationaliteit=medewerker.nationaliteit,
            in_dienst=medewerker.in_dienst,
            uit_dienst=medewerker.uit_dienst,
            pas_type=medewerker.pas_type,
            pas_nummer=medewerker.pas_nummer,
            pas_vervaldatum=medewerker.pas_vervaldatum,
            pas_foto=medewerker.pas_foto,
            contract_type=medewerker.contract_type,
            contract_uren=medewerker.contract_uren,
            contract_vervaldatum=medewerker.contract_vervaldatum,
            contract_bestand=medewerker.contract_bestand
        )
    except Exception as e:
        logger.error(f"Error fetching employee {medewerker_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{medewerker_id}", response_model=EmployeeResponse)
async def update_medewerker(
    medewerker_id: int,
    medewerker_update: MedewerkerUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Update an employee profile."""
    try:
        # Check if user has admin role
        if not hasattr(current_user, 'roles'):
            raise HTTPException(status_code=403, detail="User roles not found")
            
        user_roles = [role.name for role in current_user.roles]
        if "admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Only admin users can update employee profiles")
        
        # Get the employee with user relationship
        db_medewerker = db.query(Medewerker).options(
            joinedload(Medewerker.user)
        ).filter(Medewerker.id == medewerker_id).first()
        
        if not db_medewerker:
            raise HTTPException(status_code=404, detail="Employee not found")
            
        if not db_medewerker.user:
            raise HTTPException(status_code=404, detail="User not found for employee")
        
        # Log the update data
        logger.debug(f"Updating employee {medewerker_id} with data: {medewerker_update.dict()}")
        
        # Update employee fields
        update_data = medewerker_update.dict(exclude_unset=True)
        
        # Validate required fields
        required_fields = ['naam', 'voornaam', 'achternaam', 'initialen', 'email']
        missing_fields = [field for field in required_fields if field not in update_data or not update_data[field]]
        if missing_fields:
            raise HTTPException(
                status_code=422,
                detail=[{"field": field, "message": "This field is required"} for field in missing_fields]
            )
        
        # Validate email format
        if 'email' in update_data:
            if not re.match(r"[^@]+@[^@]+\.[^@]+", update_data['email']):
                raise HTTPException(
                    status_code=422,
                    detail=[{"field": "email", "message": "Invalid email format"}]
                )
        
        # Validate BSN format if provided
        if 'bsn' in update_data and update_data['bsn']:
            if not re.match(r"^\d{9}$", update_data['bsn']):
                raise HTTPException(
                    status_code=422,
                    detail=[{"field": "bsn", "message": "BSN must be exactly 9 digits"}]
                )
        
        # Handle date fields
        date_fields = ['geboortedatum', 'pas_vervaldatum', 'in_dienst', 'uit_dienst', 'contract_vervaldatum']
        for field in date_fields:
            if field in update_data and update_data[field]:
                try:
                    # Try parsing the date in different formats
                    date_str = update_data[field]
                    if isinstance(date_str, str):
                        # Try parsing as ISO format first
                        try:
                            date = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
                        except ValueError:
                            # Try parsing as YYYY-MM-DD format
                            try:
                                date = datetime.strptime(date_str, '%Y-%m-%d')
                            except ValueError:
                                # Try parsing as DD-MM-YYYY format
                                try:
                                    date = datetime.strptime(date_str, '%d-%m-%Y')
                                except ValueError:
                                    # Try parsing as MM/DD/YYYY format
                                    try:
                                        date = datetime.strptime(date_str, '%m/%d/%Y')
                                    except ValueError:
                                        # If all parsing attempts fail, try to extract date parts
                                        try:
                                            # Try to extract year, month, day from the string
                                            parts = re.findall(r'\d+', date_str)
                                            if len(parts) >= 3:
                                                year = int(parts[0]) if len(parts[0]) == 4 else int(parts[2])
                                                month = int(parts[1]) if len(parts[0]) == 4 else int(parts[0])
                                                day = int(parts[2]) if len(parts[0]) == 4 else int(parts[1])
                                                date = datetime(year, month, day)
                                            else:
                                                raise ValueError("Could not extract date parts")
                                        except (ValueError, IndexError):
                                            logger.warning(f"Could not parse date {date_str} for field {field}, setting to None")
                                            update_data[field] = None
                                            continue
                        
                        # Validate future dates for certain fields
                        if field in ['geboortedatum', 'in_dienst'] and date > datetime.now():
                            raise HTTPException(
                                status_code=422,
                                detail=[{"field": field, "message": f"{field} cannot be in the future"}]
                            )
                        
                        update_data[field] = date
                except (ValueError, TypeError) as e:
                    logger.error(f"Error parsing date field {field}: {str(e)}")
                    # Instead of raising an error, set the field to None
                    update_data[field] = None
                    continue
        
        # Update fields
        for key, value in update_data.items():
            if value is not None:  # Only update non-null values
                setattr(db_medewerker, key, value)
        
        try:
            db.commit()
            db.refresh(db_medewerker)
            logger.debug(f"Successfully updated employee {medewerker_id}")
        except Exception as e:
            db.rollback()
            logger.error(f"Database error while updating employee {medewerker_id}: {str(e)}")
            logger.error(f"Error type: {type(e)}")
            logger.error(f"Error details: {e.__dict__ if hasattr(e, '__dict__') else 'No details available'}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
        
        # Convert to EmployeeResponse
        return EmployeeResponse(
            id=db_medewerker.id,
            username=db_medewerker.user.username,
            email=db_medewerker.email,
            full_name=db_medewerker.naam,
            roles=[role.name for role in db_medewerker.user.roles],
            personeelsnummer=db_medewerker.id,
            uurloner=db_medewerker.contract_type == "Uurloner",
            telefoonvergoeding_per_uur=2.0,
            maaltijdvergoeding_per_uur=1.5,
            de_minimis_bonus_per_uur=0.5,
            wkr_toeslag_per_uur=1.0,
            kilometervergoeding=0.23,
            max_km=60,
            hourly_allowance=15.0,
            naam=db_medewerker.naam,
            voornaam=db_medewerker.voornaam,
            tussenvoegsel=db_medewerker.tussenvoegsel,
            achternaam=db_medewerker.achternaam,
            initialen=db_medewerker.initialen,
            telefoon=db_medewerker.telefoon,
            adres=db_medewerker.adres,
            huisnummer=db_medewerker.huisnummer,
            huisnummer_toevoeging=db_medewerker.huisnummer_toevoeging,
            postcode=db_medewerker.postcode,
            stad=db_medewerker.stad,
            geboortedatum=db_medewerker.geboortedatum,
            geboorteplaats=db_medewerker.geboorteplaats,
            geslacht=db_medewerker.geslacht,
            burgerlijke_staat=db_medewerker.burgerlijke_staat,
            bsn=db_medewerker.bsn,
            nationaliteit=db_medewerker.nationaliteit,
            in_dienst=db_medewerker.in_dienst,
            uit_dienst=db_medewerker.uit_dienst,
            pas_type=db_medewerker.pas_type,
            pas_nummer=db_medewerker.pas_nummer,
            pas_vervaldatum=db_medewerker.pas_vervaldatum,
            pas_foto=db_medewerker.pas_foto,
            contract_type=db_medewerker.contract_type,
            contract_uren=db_medewerker.contract_uren,
            contract_vervaldatum=db_medewerker.contract_vervaldatum,
            contract_bestand=db_medewerker.contract_bestand
        )
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error updating employee {medewerker_id}: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error details: {e.__dict__ if hasattr(e, '__dict__') else 'No details available'}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{medewerker_id}")
async def delete_medewerker(
    medewerker_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Delete an employee by ID."""
    try:
        # Check if user has admin role
        if not hasattr(current_user, 'roles'):
            raise HTTPException(status_code=403, detail="User roles not found")
            
        user_roles = [role.name for role in current_user.roles]
        if "admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Only admin users can delete employees")
        
        # Get the employee
        medewerker = db.query(Medewerker).filter(Medewerker.id == medewerker_id).first()
        if not medewerker:
            raise HTTPException(status_code=404, detail="Employee not found")
        
        # Delete the employee
        db.delete(medewerker)
        db.commit()
        
        return {"message": "Employee deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e)) 