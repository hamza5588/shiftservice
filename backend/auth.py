from datetime import datetime, timedelta
from typing import Optional, List, Dict
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from pydantic import BaseModel
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from database import get_db
from models import User, Role, Medewerker
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# JWT Configuration
SECRET_KEY = "mijnzeergeheime_sleutel"  # Use environment variable in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

router = APIRouter(tags=["auth"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Pydantic models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserBase(BaseModel):
    username: str
    email: str
    full_name: str

class UserCreate(UserBase):
    password: str
    role: str

class UserResponse(UserBase):
    id: int
    roles: List[str]

    class Config:
        orm_mode = True

    @classmethod
    def from_orm(cls, obj):
        # Create a dict with the base fields
        data = {
            "id": obj.id,
            "username": obj.username,
            "email": obj.email,
            "full_name": obj.full_name,
            "roles": [role.name for role in obj.roles]
        }
        logger.debug(f"UserResponse.from_orm: {data}")
        return cls(**data)

class RoleCreate(BaseModel):
    name: str
    permissions: List[str]

class RoleResponse(BaseModel):
    id: int
    name: str
    permissions: List[str]

    class Config:
        orm_mode = True

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_user(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    user = get_user(db, username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = get_user(db, username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

async def get_current_active_user(current_user: User = Depends(get_current_user)):
    return current_user

def require_roles(required_roles: List[str]):
    async def role_checker(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
        user_roles = [role.name for role in current_user.roles]
        logger.debug(f"User roles: {user_roles}, Required roles: {required_roles}")
        if not any(role in user_roles for role in required_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not enough permissions"
            )
        return current_user
    return role_checker

@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/users/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_active_user)):
    logger.debug(f"Current user: {current_user.username}, Roles: {[role.name for role in current_user.roles]}")
    return current_user

@router.post("/users/", response_model=UserResponse)
async def create_user(
    user: UserCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(["admin"]))
):
    logger.info(f"Starting user creation process for username: {user.username}")
    logger.info(f"Role requested: '{user.role}'")
    
    try:
        # Start a transaction
        db.begin()
        logger.info("Transaction started")
        
        # Check if username already exists
        db_user = db.query(User).filter(User.username == user.username).first()
        if db_user:
            logger.warning(f"Username {user.username} already exists")
            raise HTTPException(status_code=400, detail="Username already registered")
        
        # Check if email already exists in both User and Medewerker tables
        existing_email_user = db.query(User).filter(User.email == user.email).first()
        if existing_email_user:
            logger.warning(f"Email {user.email} already exists in users table")
            raise HTTPException(status_code=400, detail="Email address already registered")
            
        existing_email_employee = db.query(Medewerker).filter(Medewerker.email == user.email).first()
        if existing_email_employee:
            logger.warning(f"Email {user.email} already exists in medewerkers table")
            raise HTTPException(status_code=400, detail="Email address already registered")
        
        # Get the role
        role = db.query(Role).filter(Role.name == user.role).first()
        if not role:
            logger.error(f"Role '{user.role}' not found")
            raise HTTPException(status_code=404, detail="Role not found")
        
        logger.info(f"Found role: '{role.name}'")
        
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
        logger.info(f"Checking if role is employee. Role name: '{user.role}', Type: {type(user.role)}")
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
    except HTTPException:
        db.rollback()
        raise
    except Exception as e:
        logger.error(f"Unexpected error in create_user: {str(e)}")
        logger.error(f"Error type: {type(e)}")
        logger.error(f"Error details: {e.__dict__ if hasattr(e, '__dict__') else 'No details available'}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/roles/", response_model=RoleResponse)
async def create_role(role: RoleCreate, current_user: dict = Depends(require_roles(["admin"]))):
    db = next(get_db())
    db_role = Role(name=role.name, permissions=role.permissions)
    db.add(db_role)
    db.commit()
    db.refresh(db_role)
    return db_role

@router.get("/roles/", response_model=List[RoleResponse])
async def get_roles(current_user: dict = Depends(require_roles(["admin"]))):
    db = next(get_db())
    return db.query(Role).all()

@router.delete("/roles/{role_id}", response_model=RoleResponse)
async def delete_role(role_id: int, current_user: dict = Depends(require_roles(["admin"]))):
    db = next(get_db())
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    
    # Check if role is being used by any users
    if role.users:
        raise HTTPException(status_code=400, detail="Cannot delete role that is assigned to users")
    
    db.delete(role)
    db.commit()
    return role
