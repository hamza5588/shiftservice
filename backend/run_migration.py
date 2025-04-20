from alembic.config import Config
from alembic import command
import os

def run_migrations():
    # Get the absolute path to the alembic.ini file
    alembic_ini_path = os.path.join(os.path.dirname(__file__), 'alembic.ini')
    
    # Create Alembic configuration
    alembic_cfg = Config(alembic_ini_path)
    
    # Set the script location
    alembic_cfg.set_main_option('script_location', os.path.join(os.path.dirname(__file__), 'migrations'))
    
    # Run the upgrade command
    command.upgrade(alembic_cfg, 'head')
    print("Database migration completed successfully!")

if __name__ == "__main__":
    run_migrations() 