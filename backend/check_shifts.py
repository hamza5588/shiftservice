from database import SessionLocal
from models import Shift
from datetime import date

def check_shifts():
    db = SessionLocal()
    try:
        # Query shifts for May 21, 2025
        shifts = db.query(Shift).filter(Shift.datum == date(2025, 5, 21)).all()
        print(f'Found {len(shifts)} shifts on May 21:')
        for shift in shifts:
            print(f'Shift {shift.id}: {shift.start_tijd} - {shift.eind_tijd} at location {shift.location_id} (Status: {shift.status}, Employee: {shift.medewerker_id})')
    finally:
        db.close()

if __name__ == "__main__":
    check_shifts() 