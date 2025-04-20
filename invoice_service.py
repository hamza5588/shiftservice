from datetime import datetime, time, date, timedelta
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from models import Shift, Invoice, InvoiceItem, PayrollEntry, PayrollPeriod
import logging

logger = logging.getLogger(__name__)

# Bonus percentages
BONUS_PERCENTAGES = {
    'normal': 0.0,      # 06:00-22:00
    'evening': 0.10,    # 22:00-00:00
    'night': 0.20,      # 00:00-06:00
    'weekend': 0.35,    # All day Saturday & Sunday
    'holiday': 0.50,    # Full holiday day
    'new_year': 1.00    # New Year's Eve from 16:00
}

# VAT percentage
VAT_PERCENTAGE = 0.21

def calculate_time_bonus(start_time: time, end_time: time, work_date: date) -> Dict[str, float]:
    """
    Calculate bonus percentages for different time periods within a shift.
    Returns a dictionary with time types and their respective hours.
    """
    result = {
        'normal': 0.0,
        'evening': 0.0,
        'night': 0.0,
        'weekend': 0.0,
        'holiday': 0.0,
        'new_year': 0.0
    }

    # Check if it's a weekend
    is_weekend = work_date.weekday() >= 5  # 5 = Saturday, 6 = Sunday
    if is_weekend:
        result['weekend'] = (datetime.combine(date.today(), end_time) - 
                           datetime.combine(date.today(), start_time)).total_seconds() / 3600
        return result

    # Check if it's a holiday (you'll need to implement holiday checking)
    is_holiday = False  # Implement holiday checking
    if is_holiday:
        result['holiday'] = (datetime.combine(date.today(), end_time) - 
                           datetime.combine(date.today(), start_time)).total_seconds() / 3600
        return result

    # Check if it's New Year's Eve after 16:00
    is_new_year_eve = (work_date.month == 12 and work_date.day == 31 and 
                      start_time >= time(16, 0))
    if is_new_year_eve:
        result['new_year'] = (datetime.combine(date.today(), end_time) - 
                            datetime.combine(date.today(), start_time)).total_seconds() / 3600
        return result

    # Calculate regular time periods
    time_ranges = [
        (time(6, 0), time(22, 0), 'normal'),
        (time(22, 0), time(0, 0), 'evening'),
        (time(0, 0), time(6, 0), 'night')
    ]

    for range_start, range_end, time_type in time_ranges:
        if start_time < range_end and end_time > range_start:
            overlap_start = max(start_time, range_start)
            overlap_end = min(end_time, range_end)
            hours = (datetime.combine(date.today(), overlap_end) - 
                    datetime.combine(date.today(), overlap_start)).total_seconds() / 3600
            result[time_type] = hours

    return result

def calculate_shift_amount(shift: Shift, base_rate: float) -> Dict[str, float]:
    """
    Calculate the total amount for a shift including all bonuses.
    """
    start_time = datetime.strptime(shift.start_tijd, "%H:%M").time()
    end_time = datetime.strptime(shift.eind_tijd, "%H:%M").time()
    work_date = shift.datum

    time_bonuses = calculate_time_bonus(start_time, end_time, work_date)
    
    total_amount = 0.0
    for time_type, hours in time_bonuses.items():
        bonus_rate = base_rate * (1 + BONUS_PERCENTAGES[time_type])
        total_amount += hours * bonus_rate

    return {
        'total_amount': total_amount,
        'hours_worked': sum(time_bonuses.values()),
        'time_bonuses': time_bonuses
    }

def create_invoice(
    db: Session,
    employee_id: str,
    location_id: int,
    period_start: date,
    period_end: date,
    base_rate: float
) -> Invoice:
    """
    Create an invoice for an employee's shifts in a given period.
    """
    # Get all shifts for the employee in the period
    shifts = db.query(Shift).filter(
        Shift.medewerker_id == employee_id,
        Shift.location_id == location_id,
        Shift.datum >= period_start,
        Shift.datum <= period_end,
        Shift.status == 'completed'
    ).all()

    if not shifts:
        raise ValueError("No shifts found for the given period")

    # Create invoice
    invoice = Invoice(
        invoice_number=f"INV-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
        location_id=location_id,
        employee_id=employee_id,
        period_start=period_start,
        period_end=period_end,
        base_rate=base_rate,
        status='draft'
    )
    db.add(invoice)
    db.flush()  # Get the invoice ID

    total_amount = 0.0
    total_hours = 0.0

    # Create invoice items for each shift
    for shift in shifts:
        shift_calculation = calculate_shift_amount(shift, base_rate)
        
        # Create invoice item
        item = InvoiceItem(
            invoice_id=invoice.id,
            shift_id=shift.id,
            date=shift.datum,
            start_time=datetime.strptime(shift.start_tijd, "%H:%M").time(),
            end_time=datetime.strptime(shift.eind_tijd, "%H:%M").time(),
            hours_worked=shift_calculation['hours_worked'],
            rate_type='normal',  # This should be updated based on the actual time
            base_rate=base_rate,
            bonus_percentage=max(BONUS_PERCENTAGES.values()),
            total_amount=shift_calculation['total_amount']
        )
        db.add(item)

        total_amount += shift_calculation['total_amount']
        total_hours += shift_calculation['hours_worked']

    # Update invoice totals
    invoice.total_hours = total_hours
    invoice.total_amount = total_amount
    invoice.vat_amount = total_amount * VAT_PERCENTAGE
    invoice.status = 'sent'

    db.commit()
    return invoice

def create_payroll_entry(
    db: Session,
    employee_id: str,
    period_id: int,
    base_salary: float,
    phone_allowance: float = 0.0,
    meal_allowance: float = 0.0,
    travel_allowance: float = 0.0
) -> PayrollEntry:
    """
    Create a payroll entry for an employee in a given period.
    """
    # Get all shifts for the employee in the period
    period = db.query(PayrollPeriod).filter(PayrollPeriod.id == period_id).first()
    if not period:
        raise ValueError("Payroll period not found")

    shifts = db.query(Shift).filter(
        Shift.medewerker_id == employee_id,
        Shift.datum >= period.start_date,
        Shift.datum <= period.end_date,
        Shift.status == 'completed'
    ).all()

    # Calculate bonuses
    evening_bonus = 0.0
    night_bonus = 0.0
    weekend_bonus = 0.0
    holiday_bonus = 0.0
    new_year_bonus = 0.0
    total_hours = 0.0

    for shift in shifts:
        start_time = datetime.strptime(shift.start_tijd, "%H:%M").time()
        end_time = datetime.strptime(shift.eind_tijd, "%H:%M").time()
        work_date = shift.datum

        time_bonuses = calculate_time_bonus(start_time, end_time, work_date)
        
        evening_bonus += time_bonuses['evening'] * base_salary * BONUS_PERCENTAGES['evening']
        night_bonus += time_bonuses['night'] * base_salary * BONUS_PERCENTAGES['night']
        weekend_bonus += time_bonuses['weekend'] * base_salary * BONUS_PERCENTAGES['weekend']
        holiday_bonus += time_bonuses['holiday'] * base_salary * BONUS_PERCENTAGES['holiday']
        new_year_bonus += time_bonuses['new_year'] * base_salary * BONUS_PERCENTAGES['new_year']
        total_hours += sum(time_bonuses.values())

    # Calculate total amount
    total_amount = (
        base_salary * total_hours +
        evening_bonus +
        night_bonus +
        weekend_bonus +
        holiday_bonus +
        new_year_bonus +
        phone_allowance +
        meal_allowance +
        travel_allowance
    )

    # Create payroll entry
    entry = PayrollEntry(
        employee_id=employee_id,
        period_id=period_id,
        total_hours=total_hours,
        base_salary=base_salary,
        evening_bonus=evening_bonus,
        night_bonus=night_bonus,
        weekend_bonus=weekend_bonus,
        holiday_bonus=holiday_bonus,
        new_year_bonus=new_year_bonus,
        phone_allowance=phone_allowance,
        meal_allowance=meal_allowance,
        travel_allowance=travel_allowance,
        total_amount=total_amount,
        status='draft'
    )

    db.add(entry)
    db.commit()
    return entry 