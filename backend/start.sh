#!/bin/bash

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
while ! nc -z mysql 3306; do
  sleep 0.1
done
echo "MySQL is ready!"

# Initialize the database
echo "Initializing database..."
python init_db.py

# Wait a moment to ensure database operations are complete
sleep 2

# Start the application
echo "Starting the application..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload 