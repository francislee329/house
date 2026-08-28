@echo off
echo ============================================
echo   HK Flat Value Finder - Starting All
echo ============================================

REM Kill any existing processes on port 8000 and 3000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /f /pid %%a >nul 2>&1

echo.
echo [1/3] Seeding database...
uv run python -m src.scrapers.seed_data

echo.
echo [2/3] Starting API server (port 8000, auto-reload)...
start "HKFlat-API" cmd /k "uv run uvicorn src.api.main:app --host 0.0.0.0 --port 8000 --reload"

echo.
echo [3/3] Starting Frontend (port 3000)...
cd frontend
start "HKFlat-Frontend" cmd /k "npm run dev"

echo.
echo ============================================
echo   All started!
echo   API:      http://localhost:8000
echo   Frontend: http://localhost:3000
echo ============================================
echo.
echo Press any key to open in browser...
pause >nul
start http://localhost:3000
