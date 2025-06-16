from datetime import datetime, date, timedelta, time
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP
from database import SessionLocal
from models import Shift, Opdrachtgever, Location, Factuur, LocationRate
from facturatie import generate_invoice_number
import logging
import sys
import os
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
import io
import time
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, text

# Create logs directory in the backend directory
log_dir = os.path.join(os.path.dirname(__file__), 'logs')
os.makedirs(log_dir, exist_ok=True)

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Create handlers
file_handler = logging.FileHandler(os.path.join(log_dir, 'weekly_invoice_update.log'))
console_handler = logging.StreamHandler(sys.stdout)

# Create formatters and add it to handlers
log_format = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
file_handler.setFormatter(log_format)
console_handler.setFormatter(log_format)

# Add handlers to the logger
logger.addHandler(file_handler)
logger.addHandler(console_handler)

# Scheduler Configuration
SCHEDULE_INTERVAL = None  # Remove interval scheduling

# Initialize scheduler with more detailed logging
scheduler = BackgroundScheduler(
    timezone='Europe/Amsterdam',
    job_defaults={
        'coalesce': True,
        'max_instances': 1
    }
)

@dataclass
class LocationData:
    id: int
    name: str
    client_id: int
    address: str
    city: str
    postal_code: str

@dataclass
class Employee:
    id: str
    name: str
    email: str

@dataclass
class Client:
    id: int
    name: str
    email: str
    kvk_number: str
    address: str
    postal_code: str
    city: str

@dataclass
class ShiftData:
    id: int
    date: date
    start_time: time
    end_time: time
    employee_id: str
    location_id: int
    title: str
    status: str = "completed"

@dataclass
class RateConfig:
    rate: float  # base rate
    evening_rate: float = 0.0
    night_rate: float = 0.0
    weekend_rate: float = 0.0
    holiday_rate: float = 0.0
    new_years_eve_rate: float = 0.0

    def __init__(self, rate: float, evening_rate: float = None, night_rate: float = None, 
                 weekend_rate: float = None, holiday_rate: float = None, new_years_eve_rate: float = None):
        self.rate = rate
        self.evening_rate = evening_rate or rate * 1.1  # 10% higher than base
        self.night_rate = night_rate or rate * 1.2      # 20% higher than base
        self.weekend_rate = weekend_rate or rate * 1.35  # 35% higher than base
        self.holiday_rate = holiday_rate or rate * 1.5   # 50% higher than base
        self.new_years_eve_rate = new_years_eve_rate or rate * 2.0  # 100% higher than base

@dataclass
class ShiftBreakdown:
    day_hours: Decimal
    evening_hours: Decimal
    night_hours: Decimal
    weekend_hours: Decimal
    holiday_hours: Decimal

@dataclass
class InvoiceLineItem:
    date: date
    employee_name: str
    location_name: str
    shift_start: time
    shift_end: time
    breakdown: ShiftBreakdown
    rates: RateConfig
    total_amount: Decimal

@dataclass
class Invoice:
    client: Client
    invoice_date: date
    start_date: date
    end_date: date
    line_items: List[InvoiceLineItem]
    total_amount: Decimal
    vat_rate: Decimal = Decimal('0.21')
    vat_amount: Decimal = Decimal('0')
    grand_total: Decimal = Decimal('0')

def calculate_shift_hours(start_time: time, end_time: time, shift_date: date) -> ShiftBreakdown:
    """Calculate the breakdown of hours for different rate types."""
    # Convert times to minutes for easier calculation
    def time_to_minutes(t: time) -> int:
        return t.hour * 60 + t.minute

    start_minutes = time_to_minutes(start_time)
    end_minutes = time_to_minutes(end_time)
    
    # Handle overnight shifts
    if end_minutes <= start_minutes:
        end_minutes += 24 * 60

    # Define rate periods (in minutes)
    day_start = 6 * 60  # 06:00
    day_end = 18 * 60   # 18:00
    evening_start = 18 * 60  # 18:00
    evening_end = 22 * 60    # 22:00
    night_start = 22 * 60    # 22:00
    night_end = 6 * 60       # 06:00

    # Initialize hours
    day_hours = Decimal('0')
    evening_hours = Decimal('0')
    night_hours = Decimal('0')
    weekend_hours = Decimal('0')
    holiday_hours = Decimal('0')

    # Check if it's a weekend
    is_weekend = shift_date.weekday() >= 5

    # Calculate hours for each period
    def calculate_period_hours(period_start: int, period_end: int) -> Decimal:
        if period_end <= period_start:
            period_end += 24 * 60
        
        overlap_start = max(start_minutes, period_start)
        overlap_end = min(end_minutes, period_end)
        
        if overlap_end <= overlap_start:
            return Decimal('0')
        
        return Decimal(str((overlap_end - overlap_start) / 60)).quantize(Decimal('0.01'), ROUND_HALF_UP)

    # Calculate regular hours
    if not is_weekend:
        day_hours = calculate_period_hours(day_start, day_end)
        evening_hours = calculate_period_hours(evening_start, evening_end)
        night_hours = calculate_period_hours(night_start, night_end)
    else:
        weekend_hours = Decimal(str((end_minutes - start_minutes) / 60)).quantize(Decimal('0.01'), ROUND_HALF_UP)

    return ShiftBreakdown(
        day_hours=day_hours,
        evening_hours=evening_hours,
        night_hours=night_hours,
        weekend_hours=weekend_hours,
        holiday_hours=holiday_hours
    )

def calculate_line_item_amount(breakdown: ShiftBreakdown, rates: RateConfig) -> Decimal:
    """Calculate the total amount for a line item based on hours and rates."""
    total = (
        breakdown.day_hours * Decimal(str(rates.rate)) +
        breakdown.evening_hours * Decimal(str(rates.evening_rate)) +
        breakdown.night_hours * Decimal(str(rates.night_rate)) +
        breakdown.weekend_hours * Decimal(str(rates.weekend_rate)) +
        breakdown.holiday_hours * Decimal(str(rates.holiday_rate))
    )
    return total.quantize(Decimal('0.01'), ROUND_HALF_UP)

def get_location_rate(db: Session, location_id: int) -> RateConfig:
    """Get rate configuration for a location, or return default if not found."""
    # Try to get the rate from LocationRate
    location_rate = db.query(LocationRate).filter(
        LocationRate.location_id == location_id
    ).first()
    
    if location_rate:
        return RateConfig(
            rate=location_rate.base_rate,
            evening_rate=location_rate.evening_rate,
            night_rate=location_rate.night_rate,
            weekend_rate=location_rate.weekend_rate,
            holiday_rate=location_rate.holiday_rate,
            new_years_eve_rate=location_rate.new_years_eve_rate
        )
    
    # Default rate if no location rate found
    return RateConfig(rate=20.0)

def check_invoice_exists(db: Session, client_id: int, start_date: date, end_date: date, total_amount: Decimal) -> bool:
    """Check if an invoice already exists for the given client and date range with the same amount."""
    existing_invoice = db.query(Factuur).filter(
        and_(
            Factuur.opdrachtgever_id == client_id,
            Factuur.shift_date == start_date,
            Factuur.shift_date_end == end_date,
            Factuur.bedrag == total_amount,
            Factuur.status == 'open'
        )
    ).first()
    
    if existing_invoice:
        logger.info(f"Duplicate invoice found for client {client_id} between {start_date} and {end_date} with amount {total_amount}")
        return True
    return False

def get_next_invoice_number(db: Session, client_name: str) -> str:
    """Get the next invoice number in the format YYYYMMNNN-CLIENT."""
    try:
        # Start a transaction
        db.execute(text("START TRANSACTION"))
        
        # Lock the facturen table for writing
        db.execute(text("LOCK TABLES facturen WRITE"))
        
        # Get the current year and month
        today = datetime.now()
        year_month = today.strftime("%Y%m")
        
        # Get the last invoice number for this year and month
        last_invoice = db.query(Factuur).filter(
            Factuur.factuurnummer.like(f"{year_month}%")
        ).order_by(Factuur.factuurnummer.desc()).first()
        
        if last_invoice:
            # Extract the sequence number and increment it
            last_seq = int(last_invoice.factuurnummer.split('-')[0][6:])
            next_seq = last_seq + 1
        else:
            # Start with 1 if no invoice exists for this year and month
            next_seq = 1
            
        # Get first 3 letters of client name for client digit
        client_digit = client_name[:3].upper()
        
        # Format the new invoice number
        invoice_number = f"{year_month}{next_seq:03d}-{client_digit}"
        
        # Unlock the table
        db.execute(text("UNLOCK TABLES"))
        
        # Commit the transaction
        db.execute(text("COMMIT"))
        
        return invoice_number
        
    except Exception as e:
        # Rollback in case of error
        db.execute(text("ROLLBACK"))
        # Make sure to unlock the table even if there's an error
        try:
            db.execute(text("UNLOCK TABLES"))
        except:
            pass
        raise e

def generate_weekly_invoice_for_client(
    db: Session,
    client_id: int,
    start_date: date,
    end_date: date,
    location_rates: dict
) -> Optional[Factuur]:
    """Generate a weekly invoice for a specific client."""
    try:
        # Get client
        client = db.query(Opdrachtgever).filter(Opdrachtgever.id == client_id).first()
        if not client:
            logger.error(f"Client {client_id} not found")
            return None
            
        # Get all shifts for this client in the date range
        shifts = db.query(Shift).filter(
            and_(
                Shift.location_id.in_([loc.id for loc in client.locations]),
                Shift.datum >= start_date,
                Shift.datum <= end_date,
                or_(
                    Shift.status == 'completed',
                    Shift.status == 'approved'
                ),
                Shift.factuur_id.is_(None)  # Only get shifts that haven't been invoiced
            )
        ).all()
        
        if not shifts:
            logger.info(f"No shifts found for client {client_id} between {start_date} and {end_date}")
            return None
            
        # Calculate total hours and amount using location-specific rates
        total_hours = Decimal('0')
        total_amount = Decimal('0')
        shift_details = []
        
        for shift in shifts:
            # Get rate for this location
            rate_config = location_rates.get(shift.location_id, RateConfig(rate=20.0))
            logger.debug(f"Inside generate_weekly_invoice_for_client: Type of rate_config for shift {shift.id}: {type(rate_config)}")
            logger.debug(f"Inside generate_weekly_invoice_for_client: rate_config content for shift {shift.id}: {rate_config.__dict__ if hasattr(rate_config, '__dict__') else str(rate_config)}")
            
            # Calculate shift hours
            start_time = datetime.strptime(shift.start_tijd, "%H:%M").time()
            end_time = datetime.strptime(shift.eind_tijd, "%H:%M").time()
            breakdown = calculate_shift_hours(start_time, end_time, shift.datum)
            
            # Calculate shift amount based on breakdown
            shift_amount = calculate_line_item_amount(breakdown, rate_config)
            
            shift_hours = (
                breakdown.day_hours + 
                breakdown.evening_hours + 
                breakdown.night_hours + 
                breakdown.weekend_hours + 
                breakdown.holiday_hours
            )
            
            total_hours += shift_hours
            total_amount += shift_amount
            
            # Store shift details for invoice text
            shift_details.append({
                'date': shift.datum,
                'hours': shift_hours,
                'amount': shift_amount,
                'location': shift.locatie,
                'start_time': shift.start_tijd,
                'end_time': shift.eind_tijd,
                'rate': rate_config.rate
            })

        # Check for existing invoice with the same data
        if check_invoice_exists(db, client_id, start_date, end_date, total_amount):
            logger.info(f"Duplicate invoice found for client {client_id} between {start_date} and {end_date}")
            return None
            
        # If we get here, we know there's no duplicate, so proceed with invoice creation
        today = date.today()
        
        # Get the next invoice number with proper locking
        factuurnummer = get_next_invoice_number(db, client.naam)
        
        # Calculate VAT
        vat_rate = Decimal('0.21')  # 21% VAT
        vat_amount = (total_amount * vat_rate).quantize(Decimal('0.01'), ROUND_HALF_UP)
        grand_total = total_amount + vat_amount
        
        # Create detailed invoice text with proper formatting
        invoice_text = f"""FACTUUR
DATUM: {today.strftime('%d-%m-%Y')}
FACTUURNUMMER: {factuurnummer}

SECUFY
94486786
Soetendalseweg 32c
3036ER Rotterdam
0685455793
vraagje@secufy.nl

FACTUUR AAN:
{client.naam}
KVK: {client.kvk_nummer}
{client.adres}
{client.postcode}, {client.stad}
Tel: {client.telefoon}
Email: {client.email}

FACTUUR DETAILS:
Periode: {start_date.strftime('%d-%m-%Y')} - {end_date.strftime('%d-%m-%Y')}
Locatie: {client.locations[0].naam if client.locations else 'N/A'}

UREN\tLOCATIE\tTARIEF\tDATUM\tTOTAAL
"""
        # Add shift details
        for detail in shift_details:
            invoice_text += f"{detail['hours']:.1f}\t{detail['location']}\t€{detail['rate']:.2f}\t{detail['date'].strftime('%Y-%m-%d')}\t€{detail['amount']:.2f}\n"
        
        # Add totals
        invoice_text += f"""
Subtotaal: €{total_amount:.2f}
BTW (21%): €{vat_amount:.2f}
Totaal: €{grand_total:.2f}

BEDANKT VOOR UW KLANDIZIE"""
        
        # Create invoice
        invoice = Factuur(
            opdrachtgever_id=client_id,
            opdrachtgever_naam=client.naam,
            factuurnummer=factuurnummer,
            factuurdatum=today,
            shift_date=start_date,
            shift_date_end=end_date,
            bedrag=grand_total,  # Store the total including VAT
            status='open',
            factuur_text=invoice_text,
            kvk_nummer=client.kvk_nummer,
            adres=client.adres,
            postcode=client.postcode,
            stad=client.stad,
            telefoon=client.telefoon,
            email=client.email,
            subtotal=total_amount,
            vat_amount=vat_amount,
            total_amount=grand_total
        )
        
        db.add(invoice)
        db.flush()  # Flush to get the invoice ID
        
        # Update shifts with the invoice ID
        for shift in shifts:
            shift.factuur_id = invoice.id
        
        db.commit()
        db.refresh(invoice)
        
        logger.info(f"Generated invoice {invoice.id} for client {client_id} with {len(shifts)} shifts")
        return invoice
        
    except Exception as e:
        logger.error(f"Error generating invoice for client {client_id}: {str(e)}")
        db.rollback()
        return None

def get_previous_week_dates():
    """Get the start and end dates for the previous week."""
    today = date.today()
    # Get the start of the previous week (Monday)
    start_date = today - timedelta(days=today.weekday() + 7)
    # Get the end of the previous week (Sunday)
    end_date = start_date + timedelta(days=6)
    return start_date, end_date

def generate_weekly_invoices():
    """Generate weekly invoices for all clients."""
    try:
        logger.info("Starting weekly invoice generation...")
        
        # Get database session
        db = SessionLocal()
        
        try:
            # Get all clients first to check what's in the database
            all_clients = db.query(Opdrachtgever).all()
            logger.info(f"Total clients in database: {len(all_clients)}")
            
            # Log client details
            for client in all_clients:
                logger.info(f"Client ID: {client.id}, Name: {client.naam}, Status: {client.status}")
            
            # Get all clients (including those with None status)
            clients = db.query(Opdrachtgever).filter(
                or_(
                    Opdrachtgever.status == 'active',
                    Opdrachtgever.status.is_(None)
                )
            ).all()
            
            if not clients:
                logger.info("No clients found. Please check client status in database.")
                return
                
            logger.info(f"Found {len(clients)} clients to process")
            
            # Get all location rates
            location_rates = {}
            rates = db.query(LocationRate).all()
            logger.info(f"Found {len(rates)} location rates")
            
            for rate in rates:
                location_rates[rate.location_id] = get_location_rate(db, rate.location_id)
                logger.info(f"Location {rate.location_id} rate: {location_rates[rate.location_id].rate}")
            
            # Calculate date range for last week
            end_date = date.today()
            start_date = end_date - timedelta(days=7)
            
            logger.info(f"Checking shifts between {start_date} and {end_date}")
            
            invoices_generated = 0
            
            # Generate invoices for each client
            for client in clients:
                logger.info(f"Processing client {client.id} ({client.naam})")
                
                # Log client's locations
                locations = [loc.id for loc in client.locations]
                logger.info(f"Client has {len(locations)} locations: {locations}")
                
                # Check for shifts in detail
                shifts = db.query(Shift).filter(
                    and_(
                        Shift.location_id.in_(locations),
                        Shift.datum >= start_date,
                        Shift.datum <= end_date
                    )
                ).all()
                
                logger.info(f"Found {len(shifts)} total shifts for client {client.id}")
                
                # Log shift details
                for shift in shifts:
                    logger.info(f"Shift ID: {shift.id}, Date: {shift.datum}, Status: {shift.status}, Location: {shift.location_id}")
                
                invoice = generate_weekly_invoice_for_client(
                    db,
                    client.id,
                    start_date,
                    end_date,
                    location_rates
                )
                if invoice:
                    invoices_generated += 1
                    logger.info(f"Generated invoice {invoice.id} for client {client.id}")
                else:
                    logger.info(f"No invoice generated for client {client.id}")
            
            logger.info(f"Generated {invoices_generated} invoices for the period {start_date} to {end_date}")
            
        finally:
            db.close()
            
    except Exception as e:
        logger.error(f"Error in generate_weekly_invoices: {str(e)}", exc_info=True)

def check_new_shifts():
    """Check for new shifts and update invoices if needed."""
    db = SessionLocal()
    try:
        # Get all clients (including those with None status)
        clients = db.query(Opdrachtgever).filter(
            or_(
                Opdrachtgever.status == 'active',
                Opdrachtgever.status.is_(None)
            )
        ).all()
        logger.info(f"Checking shifts for {len(clients)} clients")
        
        # Calculate date range for last week
        end_date = date.today()
        start_date = end_date - timedelta(days=7)
        
        for client in clients:
            logger.info(f"Checking shifts for client {client.id} ({client.naam})")
            
            # Get all location IDs for this client
            location_ids = [loc.id for loc in client.locations]
            if not location_ids:
                logger.info(f"No locations found for client {client.id}")
                continue
                
            logger.info(f"Client {client.id} has {len(location_ids)} locations: {location_ids}")
            
            # Get rate configuration for each location
            location_rates = {
                loc_id: get_location_rate(db, loc_id)
                for loc_id in location_ids
            }
            
            # Check if there are any new shifts for this client
            new_shifts = db.query(Shift).filter(
                and_(
                    Shift.location_id.in_(location_ids),
                    Shift.datum >= start_date,
                    Shift.datum <= end_date,
                    or_(
                        Shift.status == 'completed',
                        Shift.status == 'approved'
                    ),
                    Shift.factuur_id.is_(None)  # Only get shifts that haven't been invoiced
                )
            ).all()
            
            logger.info(f"Found {len(new_shifts)} new shifts for client {client.id}")
            
            # Log shift details
            for shift in new_shifts:
                logger.info(f"New shift ID: {shift.id}, Date: {shift.datum}, Status: {shift.status}, Location: {shift.location_id}")
            
            if new_shifts:
                # Generate or update invoice
                invoice = generate_weekly_invoice_for_client(
                    db=db,
                    client_id=client.id,
                    start_date=start_date,
                    end_date=end_date,
                    location_rates=location_rates
                )
                if invoice:
                    logger.info(f"Generated invoice {invoice.id} for client {client.id}")
                else:
                    logger.info(f"No invoice generated for client {client.id}")
                
        logger.info("Checked for new shifts and updated invoices")
    except Exception as e:
        logger.error(f"Error checking new shifts: {str(e)}", exc_info=True)
    finally:
        db.close()

def main():
    try:
        logger.info("Starting invoice generation scheduler...")
        
        # Add the weekly invoice generation job with cron trigger for Monday at 9:00 AM
        scheduler.add_job(
            generate_weekly_invoices,
            trigger=CronTrigger(
                day_of_week='mon',
                hour=9,
                minute=0
            ),
            id='weekly_invoice_generation',
            replace_existing=True
        )

        # Start the scheduler
        scheduler.start()
        logger.info("Scheduler started successfully - Running every Monday at 9:00 AM")
        
        # Print detailed scheduler status
        logger.info("Scheduler Status:")
        logger.info(f"Running: {scheduler.running}")
        logger.info(f"Number of jobs: {len(scheduler.get_jobs())}")
        for job in scheduler.get_jobs():
            logger.info(f"Job ID: {job.id}")
            logger.info(f"Next run time: {job.next_run_time}")
            logger.info(f"Trigger: {job.trigger}")
        
        # Keep the script running
        while True:
            time.sleep(1)
            
    except (KeyboardInterrupt, SystemExit):
        logger.info("Received shutdown signal")
        scheduler.shutdown()
        logger.info("Scheduler shutdown complete")
    except Exception as e:
        logger.error(f"Error in scheduler: {str(e)}", exc_info=True)
        scheduler.shutdown()
        logger.info("Scheduler shutdown due to error")

if __name__ == "__main__":
    # Ensure the log directory exists
    log_dir = os.path.join(os.path.dirname(__file__), 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    # Configure logging with more detailed format
    log_format = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    file_handler.setFormatter(log_format)
    console_handler.setFormatter(log_format)
    
    logger.info("Starting invoice generation system...")
    main() 