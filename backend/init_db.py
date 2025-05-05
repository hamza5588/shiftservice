from database import engine, SessionLocal
from models import Base, User, Role
from passlib.context import CryptContext
from add_locations import add_locations
from add_clients import add_clients
from sqlalchemy import text
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def init_db():
    try:
        logger.info("Creating tables if they don't exist...")
        # Log all tables that will be created
        for table in Base.metadata.tables:
            logger.info(f"Checking table: {table}")
        Base.metadata.create_all(bind=engine)
        
        # Add provincie column if it doesn't exist
        with engine.connect() as connection:
            try:
                # First check if the column exists
                result = connection.execute("SHOW COLUMNS FROM locations LIKE 'provincie'")
                if not result.fetchone():
                    connection.execute("ALTER TABLE locations ADD COLUMN provincie VARCHAR(100)")
                    logger.info("Added provincie column to locations table")
                else:
                    logger.info("Provincie column already exists in locations table")
            except Exception as e:
                logger.warning(f"Error checking/adding provincie column: {str(e)}")
        
        # Check if year_client column exists in facturen table
        result = connection.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='facturen' AND column_name='year_client';
        """)).fetchone()
        
        if not result:
            logger.info("Adding year_client column to facturen table...")
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
            logger.info("Successfully added year_client column and index")
        else:
            logger.info("year_client column already exists in facturen table")
        
        db = SessionLocal()
        try:
            # Create admin role if it doesn't exist
            admin_role = db.query(Role).filter(Role.name == "admin").first()
            if not admin_role:
                admin_role = Role(
                    name="admin",
                    permissions=["all"]
                )
                db.add(admin_role)
                db.commit()
                logger.info("Created admin role")

            # Create employee role if it doesn't exist
            employee_role = db.query(Role).filter(Role.name == "employee").first()
            if not employee_role:
                employee_role = Role(
                    name="employee",
                    permissions=["view_shifts", "view_schedule", "update_status"]
                )
                db.add(employee_role)
                db.commit()
                logger.info("Created employee role")

            # Create planner role if it doesn't exist
            planner_role = db.query(Role).filter(Role.name == "planner").first()
            if not planner_role:
                planner_role = Role(
                    name="planner",
                    permissions=[
                        "view_shifts",
                        "view_schedule",
                        "create_shifts",
                        "edit_shifts",
                        "delete_shifts",
                        "view_employees",
                        "assign_shifts",
                        "manage_schedule",
                        "view_requests",
                        "approve_requests"
                    ]
                )
                db.add(planner_role)
                db.commit()
                logger.info("Created planner role")

            # Create admin user if it doesn't exist
            admin_user = db.query(User).filter(User.username == "admin").first()
            if not admin_user:
                # Create admin user
                admin_user = User(
                    username="admin",
                    email="admin@example.com",
                    hashed_password=pwd_context.hash("admin"),
                    full_name="Administrator"
                )
                admin_user.roles.append(admin_role)
                db.add(admin_user)
                db.commit()
                logger.info("Created admin user")

            # Initialize clients
            logger.info("Initializing clients...")
            add_clients()
            logger.info("Clients initialized successfully!")

            # Initialize locations
            logger.info("Initializing locations...")
            add_locations()
            logger.info("Locations initialized successfully!")

            logger.info("Database initialized successfully!")
        except Exception as e:
            logger.error(f"Error during database initialization: {str(e)}")
            logger.error(f"Error type: {type(e)}")
            logger.error(f"Error details: {e.__dict__ if hasattr(e, '__dict__') else 'No details available'}")
            db.rollback()
            raise
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Error during database initialization: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error details: {e.__dict__ if hasattr(e, '__dict__') else 'No details available'}")
        raise

if __name__ == "__main__":
    init_db() 