import os
from sqlalchemy import create_engine, String
from sqlalchemy.sql import text

# Build the DB URL from environment variables (same as in database.py)
DB_USER = os.getenv("DB_USER", "planner_user")
DB_PASSWORD = os.getenv("DB_PASSWORD", "planner_password")
DB_HOST = os.getenv("DB_HOST", "mysql")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "planner_db")
SQLALCHEMY_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def upgrade():
    # Create engine
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
    
    # Add status column with default value
    with engine.connect() as conn:
        conn.execute(text("""
            ALTER TABLE opdrachtgevers 
            ADD COLUMN status VARCHAR(50) DEFAULT 'active'
        """))
        conn.commit()

if __name__ == "__main__":
    upgrade() 