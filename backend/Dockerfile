FROM python:3.9-slim

WORKDIR /app

# Install system dependencies including MySQL development libraries
RUN apt-get update && apt-get install -y \
    build-essential \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install --no-cache-dir openpyxl
RUN pip install --no-cache-dir APScheduler==3.11.0
RUN pip install --no-cache-dir holidays==0.68
RUN pip install --no-cache-dir PyJWT==2.3.0
RUN pip install --no-cache-dir websockets
# Copy the rest of the application
COPY . .

# Expose the port the app runs on
EXPOSE 8000

# Command to run the application with hot reload
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"] 