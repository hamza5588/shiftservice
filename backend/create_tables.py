from database import engine
from models import Base, ChatMessage

def create_tables():
    # This will create all tables that don't exist yet
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    create_tables()
    print("Tables created successfully") 