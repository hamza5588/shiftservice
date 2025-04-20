from sqlalchemy import text
from database import engine

def update_location_rates():
    with engine.connect() as connection:
        # First, rename the existing rate column to base_rate
        connection.execute(text("""
            ALTER TABLE location_rates 
            CHANGE COLUMN rate base_rate FLOAT NOT NULL
        """))
        
        # Add the new rate columns
        connection.execute(text("""
            ALTER TABLE location_rates 
            ADD COLUMN evening_rate FLOAT NOT NULL AFTER base_rate,
            ADD COLUMN night_rate FLOAT NOT NULL AFTER evening_rate,
            ADD COLUMN weekend_rate FLOAT NOT NULL AFTER night_rate,
            ADD COLUMN holiday_rate FLOAT NOT NULL AFTER weekend_rate,
            ADD COLUMN new_years_eve_rate FLOAT NOT NULL AFTER holiday_rate
        """))
        
        # Set default values for the new columns
        connection.execute(text("""
            UPDATE location_rates 
            SET evening_rate = base_rate,
                night_rate = base_rate,
                weekend_rate = base_rate,
                holiday_rate = base_rate,
                new_years_eve_rate = base_rate
        """))
        
        connection.commit()

if __name__ == "__main__":
    update_location_rates() 