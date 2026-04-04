#!/bin/bash

# Exit immediately if any command fails
set -e

echo "🚀 Starting Tursor Backend Setup..."

# Check if Node.js is installed (required to run backend)
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed. Please install Node.js (v18+) and try again."
    exit 1
fi

echo "✅ Node.js detected"

# Define installation directory inside user's home folder
INSTALL_DIR="$HOME/.tursor"

echo "📁 Installing to $INSTALL_DIR"

# If directory already exists, update the repo instead of cloning again
if [ -d "$INSTALL_DIR" ]; then
    echo "🔄 Existing installation found. Updating repository..."
    cd "$INSTALL_DIR"
    git pull
else
    echo "⬇️ Cloning repository..."
    git clone https://github.com/QAgent-Labs/Tursor-Extension.git "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# Install project dependencies
echo "📦 Installing dependencies..."
npm install

# Define backend port
PORT=9090

# Check if the port is already in use and kill the process if needed
PID=$(lsof -ti :$PORT || true)

if [ ! -z "$PID" ]; then
    echo "⚠️ Port $PORT is already in use. Killing existing process..."
    kill -9 $PID
fi

# Start backend server in background and redirect logs to a file
echo "⚡ Starting backend..."
nohup npm run start > tursor.log 2>&1 &

# Give the backend some time to boot up
echo "⏳ Waiting for backend to start..."
sleep 3

# Perform a health check to confirm backend is running
if curl -s http://localhost:9090/health | grep -q "ok"; then
    echo "✅ Tursor backend is running on http://localhost:9090"
else
    echo "❌ Backend failed to start. Check logs at $INSTALL_DIR/tursor.log"
    exit 1
fi

echo "🎉 Setup complete! Tursor is ready to use."