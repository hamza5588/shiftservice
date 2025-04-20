from database import get_db, engine
from models import Medewerker
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def check_employees():
    db = next(get_db())
    employees = db.query(Medewerker).all()
    print(f"Found {len(employees)} employees in the database:")
    for employee in employees:
        print(f"ID: {employee.id}, Name: {employee.naam}, Email: {employee.email}")

def check_table_schema(table_name):
    result = engine.execute(f'SHOW COLUMNS FROM {table_name};')
    columns = result.fetchall()
    print(f"\nColumns in {table_name}:")
    for column in columns:
        print(column)

if __name__ == "__main__":
    check_employees()
    check_table_schema('opdrachtgevers') 