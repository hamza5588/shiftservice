#!/bin/bash

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
max_attempts=30
attempt=1
while [ $attempt -le $max_attempts ]; do
    if mysqladmin ping -h"mysql" -u"planner_user" -p"planner_password" --silent; then
        echo "MySQL is ready!"
        break
    fi
    echo "Attempt $attempt: MySQL is not ready yet. Waiting..."
    sleep 2
    attempt=$((attempt + 1))
done

if [ $attempt -gt $max_attempts ]; then
    echo "Failed to connect to MySQL after $max_attempts attempts. Exiting."
    exit 1
fi

# Give MySQL a little extra time to fully initialize
sleep 5

# Start the application
echo "Starting the application..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload 