from database import SessionLocal
from models import Opdrachtgever

def add_clients():
    db = SessionLocal()
    
    # Define initial clients
    clients = [
        {
            "naam": "Fortisec Beveiliging BV",
            "email": "info@fortisec.nl",
            "telefoon": "020-1234567",
            "adres": "Herengracht 102, 1015 BS Amsterdam"
        },
        {
            "naam": "CleanPlus Facility Services",
            "email": "info@cleanplus.nl",
            "telefoon": "070-1234567",
            "adres": "Laan van Meerdervoort 178, 2517 BH Den Haag"
        },
        {
            "naam": "TechNova Solutions",
            "email": "info@technova.nl",
            "telefoon": "010-1234567",
            "adres": "Weena 505, 3013 AL Rotterdam"
        },
        {
            "naam": "Medicare Groep",
            "email": "info@medicare.nl",
            "telefoon": "024-1234567",
            "adres": "Sint Annastraat 293, 6525 HE Nijmegen"
        },
        {
            "naam": "Logistix Nederland BV",
            "email": "info@logistix.nl",
            "telefoon": "020-7654321",
            "adres": "Schipholweg 275, 1171 PK Badhoevedorp"
        }
    ]
    
    # Add clients if they don't exist
    for client_data in clients:
        existing_client = db.query(Opdrachtgever).filter(
            Opdrachtgever.naam == client_data["naam"]
        ).first()
        
        if not existing_client:
            client = Opdrachtgever(**client_data)
            db.add(client)
            print(f"Added client: {client_data['naam']}")
    
    db.commit()
    print("Done adding clients!")

if __name__ == "__main__":
    add_clients() 