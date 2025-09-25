@echo off
echo 🚀 Starting Food Waste Reduction Application...
echo.

echo 📁 Installing dependencies...
call npm install
cd backend && call npm install && cd ..
cd frontend && call npm install && cd ..
cd mcp-server && call npm install && cd ..

echo.
echo 🎯 Starting all services...
echo.

echo 🔗 Starting Backend API Server...
start "Backend API" cmd /k "cd backend && npm run dev"

timeout /t 3

echo 🔗 Starting MCP Server...
start "MCP Server" cmd /k "cd mcp-server && npm run dev"

timeout /t 3

echo 🌐 Starting Frontend Application...
start "Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ✅ All services are starting up!
echo.
echo 📱 Access the application:
echo   Frontend: http://localhost:3004
echo   Backend API: http://localhost:5000
echo   MCP Server: http://localhost:8000
echo.
echo 🔐 Test Login Credentials:
echo   Email: test@example.com
echo   Password: password
echo.
echo Press any key to continue...
pause >nul