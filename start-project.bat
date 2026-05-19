@echo off
title Melody LMS Runner
echo ===================================================
echo   MELODY LMS - AUTOMATIC RUNNER
echo ===================================================
echo.

echo [1/3] Freeing up Port 5000 (Backend) from any zombie processes...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000 "') do (
    echo Killing old process running on Port 5000 (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
)

echo.
echo [2/3] Starting Backend Server (Express + AI) in a new window...
start "Melody LMS Backend" cmd /k "cd server && npm run dev"

echo.
echo [3/3] Starting Frontend Server (Vite + React) in a new window...
start "Melody LMS Frontend" cmd /k "npm run dev"

echo.
echo [4/4] Opening Melody LMS website in your default browser...
timeout /t 3 >nul
start http://localhost:5173

echo.
echo ===================================================
echo   SUCCESS: Both servers launched successfully!
echo.
echo   - Backend Server is running at: http://localhost:5000
echo   - Frontend Server is running at: http://localhost:5173
echo.
echo   Press any key to close this runner.
echo ===================================================
pause >nul
