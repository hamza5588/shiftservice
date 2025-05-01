from sqlalchemy import text
from database import engine

def add_missing_columns():
    with engine.connect() as connection:
        # Add missing columns
        columns_to_add = [
            "voornaam VARCHAR(100)",
            "tussenvoegsel VARCHAR(50)",
            "achternaam VARCHAR(100)",
            "initialen VARCHAR(20)",
            "huisnummer VARCHAR(10)",
            "huisnummer_toevoeging VARCHAR(10)",
            "postcode VARCHAR(10)",
            "stad VARCHAR(100)",
            "geboorteplaats VARCHAR(100)",
            "geslacht VARCHAR(20)",
            "burgerlijke_staat VARCHAR(50)",
            "bsn VARCHAR(9)",
            "nationaliteit VARCHAR(100)",
            "pas_nummer VARCHAR(50)",
            "pas_foto_voorzijde VARCHAR(200)",
            "pas_foto_achterzijde VARCHAR(200)",
            "contract_type VARCHAR(50)",
            "contract_uren INT",
            "contract_vervaldatum DATETIME",
            "contract_bestand VARCHAR(200)"
        ]
        
        for column in columns_to_add:
            try:
                connection.execute(text(f"ALTER TABLE medewerkers ADD COLUMN {column}"))
                print(f"Added column: {column}")
            except Exception as e:
                print(f"Error adding column {column}: {str(e)}")
        
        # Add unique index for BSN
        try:
            connection.execute(text("CREATE UNIQUE INDEX ix_medewerkers_bsn ON medewerkers(bsn)"))
            print("Added BSN index")
        except Exception as e:
            print(f"Error adding BSN index: {str(e)}")

if __name__ == "__main__":
    add_missing_columns() 