import os
from dotenv import load_dotenv

# Load environment variables from config.env file
load_dotenv('config.env')

# Environment configuration
ENVIRONMENT = os.getenv('ENVIRONMENT', 'local')  # Default to local if not set

# Database configuration
DATABASE_URL = os.getenv('PROD_DB_URL') if ENVIRONMENT == 'production' else os.getenv('LOCAL_DB_URL')
API_URL = os.getenv('PROD_API_URL') if ENVIRONMENT == 'production' else os.getenv('LOCAL_API_URL')

# JWT Configuration
SECRET_KEY = os.getenv('SECRET_KEY', 'mijnzeergeheime_sleutel')  # Use environment variable in production
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# CORS configuration
if ENVIRONMENT == 'production':
    ALLOWED_ORIGINS = os.getenv('PROD_FRONTEND_URLS', '').split(',')
else:
    ALLOWED_ORIGINS = os.getenv('LOCAL_FRONTEND_URLS', '').split(',')

# Server configuration
HOST = "0.0.0.0" if ENVIRONMENT == 'production' else "127.0.0.1"
PORT = 8000
RELOAD = True if ENVIRONMENT == 'local' else False 