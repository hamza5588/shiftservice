import os
import uvicorn

# Set environment variables for local development
os.environ["DB_HOST"] = "localhost"
os.environ["DB_USER"] = "planner_user"
os.environ["DB_PASSWORD"] = "planner_password"
os.environ["DB_PORT"] = "3306"
os.environ["DB_NAME"] = "planner_db"
os.environ["SECRET_KEY"] = "your-secret-key-here"
os.environ["ALGORITHM"] = "HS256"

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True) 