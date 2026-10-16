@echo off
setlocal
title RIG - Report Intelligence Generator
cd /d "%~dp0"

rem ponytail: minimal Windows launcher mirroring run.sh; no auto-Python-install,
rem no desktop shortcuts, no Chrome app-mode (legacy rig-rebuild baggage; deleted).

echo.
echo   RIG - Report Intelligence Generator
echo.

where py >nul 2>&1
if %errorlevel% equ 0 (set "PY=py -3") else (set "PY=python")

%PY% --version >nul 2>&1
if %errorlevel% neq 0 (
    echo   Python not found.
    echo   Install from https://www.python.org/downloads/ and check "Add Python to PATH".
    echo.
    pause
    exit /b 1
)

if not exist ".venv\Scripts\python.exe" (
    echo   Creating virtual environment...
    %PY% -m venv .venv
    if errorlevel 1 (
        echo   Failed to create .venv.
        pause
        exit /b 1
    )
)

echo   Installing dependencies...
".venv\Scripts\python.exe" -m pip install -q -r requirements.txt
if errorlevel 1 (
    echo   Dependency install failed. Check your internet connection and retry.
    pause
    exit /b 1
)

echo.
echo   Starting RIG at http://localhost:8000
echo   Close this window to stop the app.
echo.
start "RIG-browser" /min cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:8000"
".venv\Scripts\python.exe" app.py

pause
