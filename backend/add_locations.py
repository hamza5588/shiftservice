from database import SessionLocal
from models import Location, Opdrachtgever

def add_locations():
    db = SessionLocal()
    
    # Get all opdrachtgevers
    opdrachtgevers = db.query(Opdrachtgever).all()
    
    # Create a mapping of opdrachtgever names to their IDs
    opdrachtgever_map = {op.naam: op.id for op in opdrachtgevers}
    
    # Define locations for each opdrachtgever
    locations_data = {
        "Fortisec Beveiliging BV": [
            {
                "naam": "Fortisec Hoofdkantoor",
                "adres": "Herengracht 102",
                "stad": "Amsterdam",
                "postcode": "1015 BS"
            },
            {
                "naam": "Fortisec Zuid",
                "adres": "Vestdijk 45",
                "stad": "Eindhoven",
                "postcode": "5611 CA"
            },
            {
                "naam": "Fortisec Havengebied",
                "adres": "Waalhaven Oostzijde 23",
                "stad": "Rotterdam",
                "postcode": "3087 BM"
            }
        ],
        "CleanPlus Facility Services": [
            {
                "naam": "CleanPlus West",
                "adres": "Laan van Meerdervoort 178",
                "stad": "Den Haag",
                "postcode": "2517 BH"
            },
            {
                "naam": "CleanPlus Noord",
                "adres": "Oosterstraat 15",
                "stad": "Groningen",
                "postcode": "9711 NN"
            },
            {
                "naam": "CleanPlus Centraal",
                "adres": "Vredenburg 40",
                "stad": "Utrecht",
                "postcode": "3511 BD"
            }
        ],
        "TechNova Solutions": [
            {
                "naam": "TechNova HQ",
                "adres": "Weena 505",
                "stad": "Rotterdam",
                "postcode": "3013 AL"
            },
            {
                "naam": "TechNova Labs",
                "adres": "Mijnbouwstraat 120",
                "stad": "Delft",
                "postcode": "2628 RX"
            },
            {
                "naam": "TechNova Support Center",
                "adres": "Claudius Prinsenlaan 128",
                "stad": "Breda",
                "postcode": "4818 CP"
            }
        ],
        "Medicare Groep": [
            {
                "naam": "Medicare Kliniek",
                "adres": "Sint Annastraat 293",
                "stad": "Nijmegen",
                "postcode": "6525 HE"
            },
            {
                "naam": "Medicare Revalidatie",
                "adres": "Rijksstraatweg 50",
                "stad": "Haarlem",
                "postcode": "2022 DB"
            },
            {
                "naam": "Medicare Ouderenzorg",
                "adres": "Groot Wezenland 21",
                "stad": "Zwolle",
                "postcode": "8011 JV"
            }
        ],
        "Logistix Nederland BV": [
            {
                "naam": "Logistix DC West",
                "adres": "Schipholweg 275",
                "stad": "Badhoevedorp",
                "postcode": "1171 PK"
            },
            {
                "naam": "Logistix DC Midden",
                "adres": "Ravenswade 54",
                "stad": "Nieuwegein",
                "postcode": "3439 LD"
            },
            {
                "naam": "Logistix DC Oost",
                "adres": "Josink Esweg 44",
                "stad": "Enschede",
                "postcode": "7545 PN"
            }
        ]
    }
    
    # Add locations for each opdrachtgever
    for opdrachtgever_name, locations in locations_data.items():
        if opdrachtgever_name in opdrachtgever_map:
            opdrachtgever_id = opdrachtgever_map[opdrachtgever_name]
            
            # Check if locations already exist for this opdrachtgever
            existing_locations = db.query(Location).filter(
                Location.opdrachtgever_id == opdrachtgever_id
            ).all()
            
            if not existing_locations:
                for location_data in locations:
                    location = Location(
                        opdrachtgever_id=opdrachtgever_id,
                        **location_data
                    )
                    db.add(location)
    
    db.commit()
    db.close()

if __name__ == "__main__":
    add_locations() 