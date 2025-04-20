from database import SessionLocal
from models import Opdrachtgever, Shift

def add_opdrachtgever():
    db = SessionLocal()
    
    # Get all unique locations from shifts
    shifts = db.query(Shift).all()
    locations = set(shift.locatie for shift in shifts)
    
    print(f"Found {len(locations)} unique locations: {locations}")
    
    # Add an opdrachtgever for each location
    for location in locations:
        # Check if opdrachtgever already exists
        existing = db.query(Opdrachtgever).filter(Opdrachtgever.naam == location).first()
        if not existing:
            opdrachtgever = Opdrachtgever(
                naam=location,
                email=f"{location.lower().replace(' ', '_')}@example.com",
                telefoon="0612345678",
                adres=f"Hoofdstraat 1, {location}"
            )
            db.add(opdrachtgever)
            print(f"Added opdrachtgever for {location}")
        else:
            print(f"Opdrachtgever for {location} already exists")
    
    db.commit()
    print("Done!")

if __name__ == "__main__":
    add_opdrachtgever() 