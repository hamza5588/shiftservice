from database import engine
from sqlalchemy import text

def check_users_table():
    with engine.connect() as conn:
        # Get table structure
        result = conn.execute(text("DESCRIBE users"))
        print("\nUsers table structure:")
        for row in result:
            print(f"Column: {row[0]}, Type: {row[1]}, Null: {row[2]}, Key: {row[3]}")
        
        # Get sample data to check id format
        result = conn.execute(text("SELECT id, username FROM users LIMIT 5"))
        print("\nSample user data:")
        for row in result:
            print(f"ID: {row[0]}, Type: {type(row[0])}, Username: {row[1]}")

if __name__ == "__main__":
    check_users_table() 