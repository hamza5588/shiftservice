#!/bin/bash

# Server details
SERVER_IP="69.28.88.75"
USERNAME="root"
PASSWORD="4YnfBLFU4yYXShQ6"

# Function to execute commands on remote server
execute_remote() {
    sshpass -p "$PASSWORD" ssh -o StrictHostKeyChecking=no $USERNAME@$SERVER_IP "$1"
}

# Function to copy files to remote server
copy_to_remote() {
    sshpass -p "$PASSWORD" scp -o StrictHostKeyChecking=no -r $1 $USERNAME@$SERVER_IP:$2
}

echo "🚀 Starting deployment..."

# 1. Create directories
echo "📁 Creating directories..."
execute_remote "mkdir -p /opt/shiftmanagement/{backend,frontend}"

# 2. Copy files
echo "📦 Copying files..."
copy_to_remote "backend/*" "/opt/shiftmanagement/backend/"
copy_to_remote "shift-service-sync/*" "/opt/shiftmanagement/frontend/"

# 3. Install Docker
echo "🐳 Installing Docker..."
execute_remote "apt-get update && apt-get install -y docker.io"
execute_remote "systemctl enable docker && systemctl start docker"

# 4. Install Docker Compose
echo "📦 Installing Docker Compose..."
execute_remote "curl -L 'https://github.com/docker/compose/releases/download/1.29.2/docker-compose-Linux-x86_64' -o /usr/local/bin/docker-compose"
execute_remote "chmod +x /usr/local/bin/docker-compose"

# 5. Start backend
echo "🔧 Starting backend..."
execute_remote "cd /opt/shiftmanagement/backend && docker-compose -f docker-compose.prod.yml up -d"

# 6. Install Node.js and build frontend
echo "📦 Setting up frontend..."
execute_remote "cd /opt/shiftmanagement/frontend && \
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash - && \
    apt-get install -y nodejs && \
    npm install && \
    npm run build"

# 7. Start frontend
echo "🚀 Starting frontend..."
execute_remote "cd /opt/shiftmanagement/frontend && \
    npm install -g pm2 && \
    pm2 start npm --name 'shiftmanagement-frontend' -- start && \
    pm2 save && pm2 startup"

echo "✅ Deployment completed!"
echo "🌐 Frontend: http://69.28.88.75:3000"
echo "🔌 Backend: http://69.28.88.75:8000" 