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
            db.refresh(admin_role)
            print("Admin role created successfully!")
        else:
            print("Admin role already exists!")
        return admin_role
    finally:
        db.close()

def create_admin_user():
    db = SessionLocal()
    try:
        # Check if admin user exists
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            # Get admin role
            admin_role = create_admin_role()
            
            # Create admin user
            hashed_password = pwd_context.hash("admin")
            admin_user = User(
                username="admin",
                email="admin@example.com",
                hashed_password=hashed_password,
                full_name="Administrator"
            )
            admin_user.roles.append(admin_role)
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
            print("Admin user created successfully!")
        else:
            print("Admin user already exists!")
            # Update admin password
            admin_user.hashed_password = pwd_context.hash("admin")
            db.commit()
            print("Admin password updated!")
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user() 