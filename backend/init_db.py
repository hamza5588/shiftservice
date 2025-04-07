from database import engine, SessionLocal
from models import Base, User, Role
from passlib.context import CryptContext

# Create all tables
Base.metadata.create_all(bind=engine)

# Create password context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def init_db():
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

        # Create employee role if it doesn't exist
        employee_role = db.query(Role).filter(Role.name == "employee").first()
        if not employee_role:
            employee_role = Role(
                name="employee",
                permissions=["view_shifts", "view_schedule", "update_status"]
            )
            db.add(employee_role)
            db.commit()

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

        # Create admin user if it doesn't exist
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = User(
                username="admin",
                email="admin@example.com",
                hashed_password=pwd_context.hash("admin123"),
                full_name="System Administrator"
            )
            admin_user.roles.append(admin_role)
            db.add(admin_user)
            db.commit()

        print("Database initialized successfully!")
    except Exception as e:
        print(f"Error initializing database: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db() 