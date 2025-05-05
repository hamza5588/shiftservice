import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from database import DATABASE_URL

def run_migration():
    engine = create_engine(DATABASE_URL)
    
    with engine.connect() as connection:
        try:
            # Check if column exists
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='facturen' AND column_name='year_client';
            """)).fetchone()
            
            if not result:
                # Add the column if it doesn't exist
                connection.execute(text("""
                    ALTER TABLE facturen
                    ADD COLUMN year_client VARCHAR(7) NULL;
                """))
                
                # Update existing records
                connection.execute(text("""
                    UPDATE facturen 
                    SET year_client = SUBSTRING(factuurnummer, 1, 7)
                    WHERE factuurnummer IS NOT NULL;
                """))
                
                # Add index
                connection.execute(text("""
                    CREATE INDEX ix_facturen_year_client ON facturen (year_client);
                """))
                
                print("Successfully added 'year_client' column to facturen table")
            else:
                print("Column 'year_client' already exists in facturen table")
                
        except Exception as e:
            print(f"Error during migration: {str(e)}")
            raise e

if __name__ == "__main__":
    run_migration() 