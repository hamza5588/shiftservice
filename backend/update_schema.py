from models import Base, LocationRate, Location, User, Role, Medewerker, Opdrachtgever, Dienstaanvraag, Shift, Factuur, Tarief, Verloning, Loonstrook, Notitie, Favoriet, Factuursjabloon, AutoApproval, AutoApprovalGlobalConfig, LocationAutoApprovalConfig
from database import engine
import logging
from sqlalchemy import inspect

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def update_database_schema():
    """Update the database schema to include new tables and columns."""
    try:
        logger.info("Starting database schema update...")
        
        # Create inspector to check existing tables
        inspector = inspect(engine)
        existing_tables = inspector.get_table_names()
        
        # Log existing tables
        if existing_tables:
            logger.info(f"Existing tables: {', '.join(existing_tables)}")
        
        # Create tables in the correct order
        Base.metadata.create_all(bind=engine)
        
        # Verify table creation
        new_tables = inspector.get_table_names()
        if new_tables:
            logger.info(f"All tables created successfully: {', '.join(new_tables)}")
        
        logger.info("Database schema updated successfully!")
    except Exception as e:
        logger.error(f"Error updating database schema: {str(e)}")
        raise

if __name__ == "__main__":
    update_database_schema() 