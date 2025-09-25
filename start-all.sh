#!/bin/bash

echo "🚀 Starting Food Waste Reduction Application..."
echo ""

echo "📁 Installing dependencies..."
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
cd mcp-server && npm install && cd ..

echo ""
echo "🎯 Starting all services..."
echo ""

# Function to start service in background
start_service() {
    local name=$1
    local dir=$2
    local command=$3
    echo "🔗 Starting $name..."
    cd $dir && $command &
    cd ..
    sleep 2
}

# Start all services
start_service "Backend API Server" "backend" "npm run dev"
start_service "MCP Server" "mcp-server" "npm run dev"
start_service "Frontend Application" "frontend" "npm run dev"

echo ""
echo "✅ All services are running!"
echo ""
echo "📱 Access the application:"
echo "   Frontend: http://localhost:3004"
echo "   Backend API: http://localhost:5000"
echo "   MCP Server: http://localhost:8000"
echo ""
echo "🔐 Test Login Credentials:"
echo "   Email: test@example.com"
echo "   Password: password"
echo ""
echo "Press Ctrl+C to stop all services"

# Wait for user input
wait