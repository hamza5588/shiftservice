from database import get_db
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

if __name__ == "__main__":
    check_employees() 