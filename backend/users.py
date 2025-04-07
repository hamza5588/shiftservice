from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import User, Role, Medewerker
from auth import get_current_user, UserResponse, UserBase, UserCreate, pwd_context
from datetime import datetime

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return current_user

@router.get("/", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all users. Only accessible for authenticated users."""
    return db.query(User).all()

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(user_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get a specific user by ID."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_update: UserBase, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update an existing user."""
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    for key, value in user_update.dict(exclude_unset=True).items():
        setattr(db_user, key, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

@router.delete("/{user_id}", response_model=UserResponse)
async def delete_user(user_id: int, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Delete a user."""
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db.delete(db_user)
    db.commit()
    return db_user

@router.post("/", response_model=UserResponse)
async def create_user(user: UserCreate, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new user. Only accessible for admin users."""
    try:
        # Check if user has admin role
        if not hasattr(current_user, 'roles'):
            raise HTTPException(status_code=403, detail="User roles not found")
            
        user_roles = [role.name for role in current_user.roles]
        if "admin" not in user_roles:
            raise HTTPException(status_code=403, detail="Only admin users can create new users")
        
        # Check if username already exists
        db_user = db.query(User).filter(User.username == user.username).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Username already registered")
        
        # Check if email already exists
        db_user = db.query(User).filter(User.email == user.email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email address already registered")
        
        # Get the role
        role = db.query(Role).filter(Role.name == user.role).first()
        if not role:
            raise HTTPException(status_code=404, detail=f"Role '{user.role}' not found")
        
        # Create new user
        hashed_password = pwd_context.hash(user.password)
        db_user = User(
            username=user.username,
            email=user.email,
            hashed_password=hashed_password,
            full_name=user.full_name
        )
        db_user.roles.append(role)
        
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        # If the user has the employee role, create an employee profile
        if user.role == "employee":
            employee = Medewerker(
                naam=user.full_name,
                email=user.email,
                in_dienst=datetime.utcnow(),
                contract_type="Uurloner",  # Default value
                contract_uren=0,  # Default value
                pas_type="Standard",  # Default value
                pas_nummer="",  # To be filled later
                pas_vervaldatum=datetime.utcnow(),  # To be updated later
                geboortedatum=datetime.utcnow()  # To be updated later
            )
            db.add(employee)
            db.commit()
            db.refresh(employee)
        
        return db_user
    except Exception as e:
        db.rollback()
        if "Duplicate entry" in str(e) and "email" in str(e):
            raise HTTPException(status_code=400, detail="Email address already registered")
        raise HTTPException(status_code=500, detail=str(e))
