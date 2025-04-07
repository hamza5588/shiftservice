from database import SessionLocal
from models import Role, User
from auth import pwd_context

def create_admin_role():
    db = SessionLocal()
    try:
        # Check if admin role exists
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if not admin_role:
            admin_role = Role(
                name="admin",
                permissions=["all"]  # Admin has all permissions
            )
            db.add(admin_role)
            db.commit()
            print("Admin role created successfully!")
        else:
            print("Admin role already exists!")
    finally:
        db.close()

def create_admin_user(username: str, email: str, password: str, full_name: str):
    db = SessionLocal()
    try:
        # Check if admin user exists
        admin_user = db.query(User).filter(User.username == username).first()
        if admin_user:
            print(f"User {username} already exists!")
            return

        # Get admin role
        admin_role = db.query(Role).filter(Role.name == "admin").first()
        if not admin_role:
            print("Admin role not found! Please create admin role first.")
            return

        # Create admin user
        hashed_password = pwd_context.hash(password)
        admin_user = User(
            username=username,
            email=email,
            hashed_password=hashed_password,
            full_name=full_name
        )
        admin_user.roles.append(admin_role)
        
        db.add(admin_user)
        db.commit()
        print(f"Admin user {username} created successfully!")
    finally:
        db.close()

if __name__ == "__main__":
    # Create admin role first
    create_admin_role()
    
    # Create admin user
    create_admin_user(
        username="admin",
        email="admin@example.com",
        password="admin123",  # Change this to a secure password
        full_name="System Administrator"
    ) 