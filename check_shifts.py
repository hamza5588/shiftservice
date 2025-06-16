from database import SessionLocal
from models import Shift, Opdrachtgever

db = SessionLocal()
try:
    client = db.query(Opdrachtgever).filter(Opdrachtgever.naam == 'hamza nawaz nawaz').first()
    print(f'Client ID: {client.id if client else None}')
    
    if client:
        shifts = db.query(Shift).filter(
            Shift.location_id.in_([loc.id for loc in client.locations])
        ).all()
        print(f'Number of shifts: {len(shifts)}')
        for shift in shifts:
            print(f'Shift {shift.id}: {shift.datum} {shift.start_tijd}-{shift.eind_tijd} at {shift.locatie}')
    else:
        print('Client not found')
finally:
    db.close() 