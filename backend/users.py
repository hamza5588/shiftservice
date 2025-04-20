from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import User, Role, Medewerker
from auth import get_current_user, UserResponse, UserBase, UserCreate, pwd_context
from datetime import datetime
import logging

router = APIRouter(
    prefix="/users",
    tags=["users"]
)

logger = logging.getLogger(__name__)

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
    logger.info(f"Starting user creation process for username: {user.username}")
    try:
        # Check if user has admin role
        if not hasattr(current_user, 'roles'):
            logger.error("User roles not found in current_user object")
            raise HTTPException(status_code=403, detail="User roles not found")
            
        user_roles = [role.name for role in current_user.roles]
        logger.info(f"Current user roles: {user_roles}")
        if "admin" not in user_roles:
            logger.warning(f"Non-admin user {current_user.username} attempted to create user")
            raise HTTPException(status_code=403, detail="Only admin users can create new users")
        
        # Check if username already exists
        logger.info(f"Checking if username {user.username} exists")
        db_user = db.query(User).filter(User.username == user.username).first()
        if db_user:
            logger.warning(f"Username {user.username} already exists")
            raise HTTPException(status_code=400, detail="Username already registered")
        
        # Check if email already exists
        logger.info(f"Checking if email {user.email} exists")
        db_user = db.query(User).filter(User.email == user.email).first()
        if db_user:
            logger.warning(f"Email {user.email} already exists")
            raise HTTPException(status_code=400, detail="Email address already registered")
        
        # Get the role
        logger.info(f"Looking up role: {user.role}")
        role = db.query(Role).filter(Role.name == user.role).first()
        if not role:
            logger.error(f"Role '{user.role}' not found in database")
            raise HTTPException(status_code=404, detail=f"Role '{user.role}' not found")
        
        logger.info(f"Creating new user with role: {user.role}")
        
        # Create the user
        logger.info("Creating user account...")
        hashed_password = pwd_context.hash(user.password)
        db_user = User(
            username=user.username,
            email=user.email,
            hashed_password=hashed_password,
            full_name=user.full_name
        )
        db_user.roles.append(role)
        db.add(db_user)
        try:
            db.flush()  # Flush to get the user ID without committing
            logger.info(f"Successfully created user account: {db_user.username}")
        except Exception as e:
            logger.error(f"Failed to create user account: {str(e)}")
            logger.error(f"Error type: {type(e)}")
            logger.error(f"Error details: {e.__dict__ if hasattr(e, '__dict__') else 'No details available'}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to create user account: {str(e)}")
        
        # If the role is employee, create an employee profile
        if user.role.lower() == "employee":
            logger.info("Role is employee, creating employee profile...")
            try:
                current_date = datetime.utcnow()
                employee = Medewerker(
                    user_id=db_user.username,  # Link to user account
                    naam=user.full_name,
                    email=user.email,
                    telefoon="",  # Default empty
                    adres="",  # Default empty
                    geboortedatum=current_date,  # Default to current date
                    in_dienst=current_date,
                    uit_dienst=None,  # Not set for new employees
                    pas_type="Standard",
                    pas_nummer="",
                    pas_vervaldatum=current_date,
                    pas_foto=None,
                    contract_type="Uurloner",
                    contract_uren=0,
                    contract_vervaldatum=None,
                    contract_bestand=None
                )
                logger.info(f"Created Medewerker object: {employee.__dict__}")
                db.add(employee)
                try:
                    db.flush()  # Flush to check for any constraint violations
                    logger.info(f"Successfully created employee profile for: {db_user.username}")
                except Exception as e:
                    logger.error(f"Failed to create employee profile: {str(e)}")
                    logger.error(f"Error type: {type(e)}")
                    logger.error(f"Error details: {e.__dict__ if hasattr(e, '__dict__') else 'No details available'}")
                    db.rollback()
                    raise HTTPException(status_code=500, detail=f"Failed to create employee profile: {str(e)}")
            except Exception as e:
                logger.error(f"Failed to create employee profile: {str(e)}")
                logger.error(f"Error type: {type(e)}")
                logger.error(f"Error details: {e.__dict__ if hasattr(e, '__dict__') else 'No details available'}")
                db.rollback()
                raise HTTPException(status_code=500, detail=f"Failed to create employee profile: {str(e)}")
        
        # Commit the transaction
        try:
            db.commit()
            logger.info("Transaction committed successfully")
        except Exception as e:
            logger.error(f"Failed to commit transaction: {str(e)}")
            logger.error(f"Error type: {type(e)}")
            logger.error(f"Error details: {e.__dict__ if hasattr(e, '__dict__') else 'No details available'}")
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to commit transaction: {str(e)}")
        
        return db_user
    except Exception as e:
        logger.error(f"Unexpected error in create_user: {str(e)}")
        db.rollback()
        if "Duplicate entry" in str(e) and "email" in str(e):
            raise HTTPException(status_code=400, detail="Email address already registered")
        raise HTTPException(status_code=500, detail=str(e))
