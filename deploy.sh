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

echo "🚀 Starting deployment process..."

# Step 1: Create necessary directories on server
echo "📁 Creating directories on server..."
execute_remote "mkdir -p /opt/shiftmanagement/{backend,frontend}"

# Step 2: Copy backend files
echo "📦 Copying backend files..."
copy_to_remote "backend/*" "/opt/shiftmanagement/backend/"

# Step 3: Copy frontend files
echo "📦 Copying frontend files..."
copy_to_remote "shift-service-sync/*" "/opt/shiftmanagement/frontend/"

# Step 4: Install Docker and Docker Compose if not present
echo "🐳 Checking Docker installation..."
execute_remote "if ! command -v docker &> /dev/null; then
    echo 'Installing Docker for Ubuntu Xenial...'
    apt-get update
    apt-get install -y apt-transport-https ca-certificates curl software-properties-common
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | apt-key add -
    add-apt-repository 'deb [arch=amd64] https://download.docker.com/linux/ubuntu xenial stable'
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io
    systemctl enable docker
    systemctl start docker
fi"

execute_remote "if ! command -v docker-compose &> /dev/null; then
    echo 'Installing Docker Compose...'
    curl -L 'https://github.com/docker/compose/releases/download/v2.20.3/docker-compose-linux-x86_64' -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi"

# Step 5: Install Node.js if not present
echo "📦 Checking Node.js installation..."
execute_remote "if ! command -v node &> /dev/null; then
    echo 'Installing Node.js...'
    curl -sL https://deb.nodesource.com/setup_12.x | bash -
    apt-get install -y nodejs
fi"

# Step 6: Build and start backend services
echo "🔧 Building and starting backend services..."
execute_remote "cd /opt/shiftmanagement/backend && docker-compose -f docker-compose.prod.yml up -d --build"

# Step 7: Install frontend dependencies and build
echo "🔧 Building frontend..."
execute_remote "cd /opt/shiftmanagement/frontend && npm install && npm run build"

# Step 8: Start frontend service using PM2
echo "🚀 Starting frontend service..."
execute_remote "if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi"
execute_remote "cd /opt/shiftmanagement/frontend && pm2 start npm --name 'shiftmanagement-frontend' -- start"

# Step 9: Save PM2 process list and configure startup
execute_remote "pm2 save && pm2 startup"

echo "✅ Deployment completed successfully!"
echo "🌐 Frontend URL: http://69.28.88.75:3000"
echo "🔌 Backend URL: http://69.28.88.75:8000" 