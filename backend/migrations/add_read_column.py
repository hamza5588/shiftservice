import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine, text
from database import DATABASE_URL

def run_migration():
    engine = create_engine(DATABASE_URL)
    
    # Add read column with default value 0 (false)
    with engine.connect() as connection:
        try:
            # Check if column exists
            result = connection.execute(text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='chat_messages' AND column_name='read';
            """)).fetchone()
            
            if not result:
                # Add the column if it doesn't exist
                connection.execute(text("""
                    ALTER TABLE chat_messages
                    ADD COLUMN `read` TINYINT(1) NOT NULL DEFAULT 0;
                """))
                print("Successfully added 'read' column to chat_messages table")
            else:
                print("Column 'read' already exists in chat_messages table")
                
        except Exception as e:
            print(f"Error during migration: {str(e)}")
            raise e

if __name__ == "__main__":
    run_migration() 