import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database configuration
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")
DB_HOST = os.getenv("DB_HOST", "db")  # Use 'db' as it's the service name in docker-compose
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "planner")

# Create database URL
DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def check_user_exists(username=None, email=None):
    """Check if a user exists in the database by username or email."""
    try:
        # Create engine and session
        engine = create_engine(DATABASE_URL)
        Session = sessionmaker(bind=engine)
        session = Session()

        # Build query
        query = "SELECT id, username, email, full_name FROM users WHERE "
        params = {}
        
        if username:
            query += "username = :username"
            params['username'] = username
        if email:
            if username:
                query += " OR "
            query += "email = :email"
            params['email'] = email

        # Execute query
        result = session.execute(text(query), params)
        users = result.fetchall()

        if users:
            print("\nFound user(s):")
            for user in users:
                print(f"ID: {user[0]}")
                print(f"Username: {user[1]}")
                print(f"Email: {user[2]}")
                print(f"Full Name: {user[3]}")
                print("-" * 30)
        else:
            print("\nNo user found with the given criteria.")

        session.close()
        engine.dispose()

    except Exception as e:
        print(f"Error checking user: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python check_user.py [--username USERNAME] [--email EMAIL]")
        print("Example: python check_user.py --username john --email john@example.com")
        sys.exit(1)

    username = None
    email = None

    # Parse command line arguments
    for i in range(1, len(sys.argv), 2):
        if sys.argv[i] == "--username":
            username = sys.argv[i + 1]
        elif sys.argv[i] == "--email":
            email = sys.argv[i + 1]

    if not username and not email:
        print("Please provide either a username or email to check")
        sys.exit(1)

    check_user_exists(username, email) 