from passlib.context import CryptContext

# Password hashing configuration
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

if __name__ == "__main__":
    # The hashed password from the database
    hashed_password = "$2b$12$b4sctJTbAN./YPEnX4Z3x.rT7V4e6Dd9ZRcGlYt3jPGqp/QY7wA02"
    
    # Test the password
    test_password = "admin"
    result = verify_password(test_password, hashed_password)
    print(f"Password 'admin' matches hash: {result}")
    
    # Create a new hash for comparison
    new_hash = pwd_context.hash("admin")
    print(f"\nNew hash for 'admin': {new_hash}")
    print(f"New hash matches original hash: {pwd_context.verify('admin', new_hash)}") 