@echo off
title RIG — Report Intelligence Generator
cd /d "%~dp0"

echo.
echo  ════════════════════════════════════════
echo   RIG — Report Intelligence Generator
echo  ════════════════════════════════════════
echo.

:: ── Step 1: Check Python ───────────────────────────────────
echo  [1/5] Checking Python...
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ╔═══════════════════════════════════════╗
    echo  ║  ERROR: Python not found!              ║
    echo  ║                                        ║
    echo  ║  Install from:                         ║
    echo  ║  https://www.python.org/downloads/     ║
    echo  ║                                        ║
    echo  ║  IMPORTANT: Check "Add Python to PATH" ║
    echo  ╚═══════════════════════════════════════╝
    echo.
    pause
    exit /b 1
)
python --version
echo.

:: ── Step 2: Check pip ─────────────────────────────────────
echo  [2/5] Checking pip...
python -m pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo        pip not found, installing...
    python -m ensurepip --default-pip
)
echo        pip OK.
echo.

:: ── Step 3: Create venv if missing ────────────────────────
echo  [3/5] Checking virtual environment...
if not exist ".venv" (
    echo        Creating virtual environment...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo.
        echo  ╔═══════════════════════════════════════╗
        echo  ║  ERROR: Failed to create venv!        ║
        echo  ╚═══════════════════════════════════════╝
        pause
        exit /b 1
    )
    echo        venv created.
) else (
    echo        venv found.
)
echo.

:: ── Step 4: Activate and install requirements ─────────────
echo  [4/5] Checking dependencies...
call .venv\Scripts\activate.bat

:: Check each package individually and install if missing
set "NEED_INSTALL=0"

python -c "import fastapi" >nul 2>&1
if %errorlevel% neq 0 (
    echo        fastapi missing — installing...
    pip install fastapi
    set "NEED_INSTALL=1"
)

python -c "import uvicorn" >nul 2>&1
if %errorlevel% neq 0 (
    echo        uvicorn missing — installing...
    pip install uvicorn
    set "NEED_INSTALL=1"
)

python -c "import httpx" >nul 2>&1
if %errorlevel% neq 0 (
    echo        httpx missing — installing...
    pip install httpx
    set "NEED_INSTALL=1"
)

python -c "import pydantic" >nul 2>&1
if %errorlevel% neq 0 (
    echo        pydantic missing — installing...
    pip install pydantic
    set "NEED_INSTALL=1"
)

python -c "import docx" >nul 2>&1
if %errorlevel% neq 0 (
    echo        python-docx missing — installing...
    pip install python-docx
    set "NEED_INSTALL=1"
)

python -c "import weasyprint" >nul 2>&1
if %errorlevel% neq 0 (
    echo        weasyprint missing — installing...
    pip install weasyprint
    set "NEED_INSTALL=1"
)

python -c "import markdown" >nul 2>&1
if %errorlevel% neq 0 (
    echo        markdown missing — installing...
    pip install markdown
    set "NEED_INSTALL=1"
)

if "%NEED_INSTALL%"=="0" (
    echo        All dependencies OK.
)
echo.

:: ── Step 5: Start server ──────────────────────────────────
echo  [5/5] Starting RIG...
echo.
echo  ════════════════════════════════════════
echo   Open  http://localhost:8000
echo   Close this window to stop.
echo  ════════════════════════════════════════
echo.

start "" http://localhost:8000
python -m uvicorn app:app --host 0.0.0.0 --port 8000
pause
