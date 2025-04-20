from datetime import datetime, time, date, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from models import Factuur, Verloning, Shift, Medewerker, Opdrachtgever, Tarief, Location, LocationRate
import holidays
import json
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
import io
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Constants for time ranges and bonus percentages
DAY_START = time(6, 0)  # 06:00
DAY_END = time(22, 0)   # 22:00
EVENING_START = time(22, 0)  # 22:00
EVENING_END = time(0, 0)     # 00:00
NIGHT_START = time(0, 0)     # 00:00
NIGHT_END = time(6, 0)       # 06:00
NEW_YEARS_EVE_START = time(16, 0)  # 16:00

# Bonus percentages
EVENING_BONUS = 0.10  # +10%
NIGHT_BONUS = 0.20    # +20%
WEEKEND_BONUS = 0.35  # +35%
HOLIDAY_BONUS = 0.50  # +50%
NEW_YEARS_EVE_BONUS = 1.00  # +100%

# VAT percentage
VAT_PERCENTAGE = 0.21

def calculate_shift_hours(start_time: time, end_time: time) -> Dict[str, float]:
    """Calculate the hours worked in different time periods."""
    def time_to_minutes(t: time) -> int:
        return t.hour * 60 + t.minute

    def minutes_to_hours(m: int) -> float:
        return m / 60.0

    start_minutes = time_to_minutes(start_time)
    end_minutes = time_to_minutes(end_time)
    
    # Handle overnight shifts
    if end_minutes <= start_minutes:
        end_minutes += 24 * 60

    day_start = time_to_minutes(DAY_START)
    day_end = time_to_minutes(DAY_END)
    evening_start = time_to_minutes(EVENING_START)
    evening_end = time_to_minutes(EVENING_END)
    night_start = time_to_minutes(NIGHT_START)
    night_end = time_to_minutes(NIGHT_END)

    def calculate_overlap(period_start: int, period_end: int) -> int:
        return max(0, min(end_minutes, period_end) - max(start_minutes, period_start))

    day_hours = minutes_to_hours(calculate_overlap(day_start, day_end))
    evening_hours = minutes_to_hours(calculate_overlap(evening_start, evening_end))
    night_hours = minutes_to_hours(calculate_overlap(night_start, night_end))

    return {
        "day_hours": day_hours,
        "evening_hours": evening_hours,
        "night_hours": night_hours
    }

def calculate_shift_payment(shift: Shift, base_rate: float, shift_date: date) -> Dict[str, Any]:
    """Calculate payment for a single shift with all applicable bonuses."""
    start_time = datetime.strptime(shift.start_tijd, "%H:%M").time()
    end_time = datetime.strptime(shift.eind_tijd, "%H:%M").time()
    
    # Get hours breakdown
    hours = calculate_shift_hours(start_time, end_time)
    
    # Check for special conditions
    is_weekend = shift_date.weekday() in [5, 6]  # Saturday or Sunday
    is_holiday = shift_date in holidays.Netherlands(years=[shift_date.year])
    is_new_years_eve = (shift_date.month == 12 and shift_date.day == 31 and 
                       start_time >= NEW_YEARS_EVE_START)
    
    # Calculate base payment
    total_hours = sum(hours.values())
    base_payment = total_hours * base_rate
    
    # Calculate bonuses
    evening_bonus = hours["evening_hours"] * base_rate * EVENING_BONUS
    night_bonus = hours["night_hours"] * base_rate * NIGHT_BONUS
    weekend_bonus = total_hours * base_rate * WEEKEND_BONUS if is_weekend else 0
    holiday_bonus = total_hours * base_rate * HOLIDAY_BONUS if is_holiday else 0
    new_years_eve_bonus = total_hours * base_rate * NEW_YEARS_EVE_BONUS if is_new_years_eve else 0
    
    total_payment = base_payment + evening_bonus + night_bonus + weekend_bonus + holiday_bonus + new_years_eve_bonus
    
    return {
        "base_payment": base_payment,
        "evening_bonus": evening_bonus,
        "night_bonus": night_bonus,
        "weekend_bonus": weekend_bonus,
        "holiday_bonus": holiday_bonus,
        "new_years_eve_bonus": new_years_eve_bonus,
        "total_payment": total_payment,
        "hours": hours,
        "is_weekend": is_weekend,
        "is_holiday": is_holiday,
        "is_new_years_eve": is_new_years_eve
    }

def generate_invoice(db: Session, opdrachtgever_id: int, start_date: date, end_date: date) -> Optional[Factuur]:
    """Generate an invoice for a specific opdrachtgever and date range."""
    try:
        logger.info(f"Starting invoice generation for opdrachtgever_id: {opdrachtgever_id}, start_date: {start_date}, end_date: {end_date}")
        
        # Get all shifts for the opdrachtgever in the date range
        shifts = db.query(Shift).join(Location).filter(
            Location.opdrachtgever_id == opdrachtgever_id,
            Shift.datum >= start_date,
            Shift.datum <= end_date,
            Shift.factuur_id == None
        ).all()
        
        if not shifts:
            logger.warning("No shifts found for the specified period")
            return None
        
        logger.info(f"Found {len(shifts)} shifts for the period")
        
        # Group shifts by location
        shifts_by_location = {}
        for shift in shifts:
            if shift.locatie not in shifts_by_location:
                shifts_by_location[shift.locatie] = []
            shifts_by_location[shift.locatie].append(shift)
        
        logger.info(f"Grouped shifts into {len(shifts_by_location)} locations")
        
        # Calculate total amount
        total_amount = 0.0
        invoice_text = []
        
        # Process each location
        for location, location_shifts in shifts_by_location.items():
            logger.info(f"Processing location: {location}")
            
            # Get location rate
            location_rate = db.query(LocationRate).filter(
                LocationRate.location_id == location_shifts[0].location_id,
                LocationRate.pass_type == location_shifts[0].required_profile
            ).first()
            
            if not location_rate:
                logger.warning(f"No rate found for location {location} and profile {location_shifts[0].required_profile}, using default rate")
                base_rate = 20.0  # Default rate
            else:
                base_rate = location_rate.base_rate
            
            # Calculate amount for this location
            location_amount = 0.0
            for shift in location_shifts:
                # Calculate hours
                hours = (shift.end_time - shift.start_time).total_seconds() / 3600
                
                # Apply rate multipliers based on time
                if is_holiday(shift.datum):
                    rate = base_rate * 1.5  # Holiday rate
                elif is_weekend(shift.datum):
                    rate = base_rate * 1.35  # Weekend rate
                elif shift.start_time.hour >= 22 or shift.start_time.hour < 6:
                    rate = base_rate * 1.2  # Night rate
                elif shift.start_time.hour >= 18:
                    rate = base_rate * 1.1  # Evening rate
                else:
                    rate = base_rate  # Day rate
                
                shift_amount = hours * rate
                location_amount += shift_amount
                
                # Add shift details to invoice text
                invoice_text.append(f"{hours:.1f}h {location} €{rate:.2f} {shift.datum.strftime('%d-%m-%Y')} €{shift_amount:.2f}")
            
            total_amount += location_amount
        
        # Calculate VAT
        vat = total_amount * 0.21
        total_with_vat = total_amount + vat
        
        logger.info(f"Generated invoice with total amount: {total_amount}, VAT: {vat}, Total incl. VAT: {total_with_vat}")
        
        # Create invoice
        invoice = Factuur(
            opdrachtgever_id=opdrachtgever_id,
            opdrachtgever_naam=shifts[0].opdrachtgever.naam,
            locatie=shifts[0].locatie,
            factuurdatum=date.today(),
            shift_date=start_date,
            shift_date_end=end_date,
            bedrag=total_amount,
            status="open",
            factuur_text="\n".join(invoice_text)
        )
        
        db.add(invoice)
        db.commit()
        
        # Update shifts with invoice ID
        for shift in shifts:
            shift.factuur_id = invoice.id
        db.commit()
        
        logger.info(f"Created invoice {invoice.id} for opdrachtgever {opdrachtgever_id}")
        return invoice
    
    except Exception as e:
        logger.error(f"Error generating invoice: {str(e)}")
        db.rollback()
        return None

def generate_payroll(db: Session, medewerker_id: int, period: str) -> Verloning:
    """Generate payroll for an employee for a specific period."""
    # Parse period (YYYY-MM)
    year, month = map(int, period.split('-'))
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1) - timedelta(days=1)
    else:
        end_date = date(year, month + 1, 1) - timedelta(days=1)
    
    # Get all shifts for the period
    shifts = db.query(Shift).filter(
        Shift.datum >= start_date,
        Shift.datum <= end_date,
        Shift.medewerker_id == medewerker_id
    ).all()
    
    # Calculate total payment and breakdown
    total_payment = 0.0
    breakdown = []
    
    for shift in shifts:
        # Get base rate for the shift
        base_rate = db.query(Tarief).filter(
            Tarief.locatie == shift.locatie,
            Tarief.pas_type == shift.required_profile
        ).first()
        
        if not base_rate:
            base_rate = 20.0  # Default rate
        else:
            base_rate = base_rate.bedrag
        
        # Calculate payment for shift
        payment = calculate_shift_payment(shift, base_rate, shift.datum)
        total_payment += payment["total_payment"]
        breakdown.append({
            "shift_id": shift.id,
            "date": shift.datum.isoformat(),
            "start_time": shift.start_tijd,
            "end_time": shift.eind_tijd,
            "payment_details": payment
        })
    
    # Create payroll record
    payroll = Verloning(
        medewerker_id=medewerker_id,
        periode=period,
        datum=datetime.now(),
        basis_loon=total_payment,
        avond_toeslag=sum(p["payment_details"]["evening_bonus"] for p in breakdown),
        nacht_toeslag=sum(p["payment_details"]["night_bonus"] for p in breakdown),
        weekend_toeslag=sum(p["payment_details"]["weekend_bonus"] for p in breakdown),
        feestdag_toeslag=sum(p["payment_details"]["holiday_bonus"] for p in breakdown),
        oudjaarsavond_toeslag=sum(p["payment_details"]["new_years_eve_bonus"] for p in breakdown),
        totaal_bedrag=total_payment,
        status="open",
        breakdown=json.dumps(breakdown)
    )
    
    db.add(payroll)
    db.commit()
    db.refresh(payroll)
    
    return payroll

    return payroll 