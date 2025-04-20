from database import engine
from sqlalchemy import inspect
from models import Base

def check_schema():
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print("Tables:", tables)
    
    if 'location_rates' in tables:
        print("\nLocation Rates Columns:")
        for column in inspector.get_columns('location_rates'):
            print(f"- {column['name']}: {column['type']}")
    else:
        print("\nLocation Rates table not found!")

if __name__ == "__main__":
    check_schema() 