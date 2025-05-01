from database import engine
from sqlalchemy import text

def verify_chat_table():
    with engine.connect() as conn:
        # Check if table exists
        result = conn.execute(text("SHOW TABLES LIKE 'chat_messages'"))
        if result.fetchone():
            print("✓ chat_messages table exists")
            
            # Check table structure
            result = conn.execute(text("DESCRIBE chat_messages"))
            print("\nTable structure:")
            for row in result:
                print(f"Column: {row[0]}, Type: {row[1]}, Null: {row[2]}, Key: {row[3]}")
        else:
            print("✗ chat_messages table does not exist")

if __name__ == "__main__":
    verify_chat_table() 