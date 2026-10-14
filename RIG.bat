@echo off
setlocal enabledelayedexpansion
title RIG — Report Intelligence Generator
cd /d "%~dp0"

echo.
echo  ══════════════════════════════════════════════════
echo   RIG — Report Intelligence Generator (Desktop)
echo  ══════════════════════════════════════════════════
echo.

:: ── Step 1: Check Python (Auto-install if missing) ───────────────────────────
echo  [1/5] Checking Python installation...
where python >nul 2>&1
if %errorlevel% neq 0 (
    where py >nul 2>&1
    if %errorlevel% neq 0 (
        echo.
        echo  ! Python is not installed.
        echo  [Setup] Downloading and installing Python 3.12 for Windows...
        echo.
        
        :: Try winget first if available
        where winget >nul 2>&1
        if !errorlevel! equ 0 (
            echo        Installing via Windows Package Manager (winget)...
            winget install Python.Python.3.12 -e --accept-package-agreements --accept-source-agreements
        ) else (
            :: Fallback: Download official installer using PowerShell
            echo        Downloading Python 3.12 installer from python.org...
            powershell -Command "Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.12.9/python-3.12.9-amd64.exe' -OutFile '%TEMP%\python_installer.exe'"
            if exist "%TEMP%\python_installer.exe" (
                echo        Running Python installer...
                "%TEMP%\python_installer.exe" /passive InstallAllUsers=0 PrependPath=1 Include_test=0 SimpleInstall=1
                del "%TEMP%\python_installer.exe" >nul 2>&1
            )
        )

        :: Refresh PATH in current session
        for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "PATH=%%b;!PATH!"
        for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "PATH=%%b;!PATH!"

        where python >nul 2>&1
        if !errorlevel! neq 0 (
            echo.
            echo  ╔══════════════════════════════════════════════════════╗
            echo  ║  Could not automatically install Python.              ║
            echo  ║  Please download and install Python from:            ║
            echo  ║  https://www.python.org/downloads/                   ║
            echo  ║  (Make sure to check "Add Python to PATH")           ║
            echo  ╚══════════════════════════════════════════════════════╝
            echo.
            pause
            exit /b 1
        )
    )
)
for /f "tokens=*" %%v in ('python --version 2^>^&1') do echo        %%v OK.
echo.

:: ── Step 2: Check pip ────────────────────────────────────────────────────────
echo  [2/5] Checking pip installer...
python -m pip --version >nul 2>&1
if %errorlevel% neq 0 (
    echo        pip missing — bootstrapping with ensurepip...
    python -m ensurepip --default-pip
)
echo        pip OK.
echo.

:: ── Step 3: Virtual Environment (.venv) ─────────────────────────────────────
echo  [3/5] Checking virtual environment...
if not exist ".venv" (
    echo        Creating .venv virtual environment...
    python -m venv .venv
    if !errorlevel! neq 0 (
        echo  ERROR: Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo        Created .venv successfully.
) else (
    echo        .venv environment ready.
)
echo.

:: ── Step 4: Install Dependencies ─────────────────────────────────────────────
echo  [4/5] Checking required packages...
call .venv\Scripts\activate.bat

python -c "import fastapi, uvicorn, httpx, pydantic, docx, markdown" >nul 2>&1
if %errorlevel% neq 0 (
    echo        Installing packages from requirements.txt...
    python -m pip install -r requirements.txt
    if !errorlevel! neq 0 (
        echo  Warning: Some packages had installation warnings. Continuing...
    )
)
echo        Dependencies OK.
echo.

:: ── Step 5: Desktop Shortcut Creation ────────────────────────────────────────
if not exist "%USERPROFILE%\Desktop\RIG.lnk" (
    echo  Creating Windows Desktop shortcut...
    powershell -ExecutionPolicy Bypass -File "%~dp0create_shortcut.ps1" -TargetDir "%~dp0" >nul 2>&1
    if exist "%USERPROFILE%\Desktop\RIG.lnk" (
        echo        Created Desktop shortcut: RIG.lnk
    )
)

:: ── Step 6: Launch RIG & Open in Google Chrome ───────────────────────────────
echo  [5/5] Launching RIG Desktop Application...
echo.

:: Run start.py which starts the server, waits for health check, then opens Chrome
python "%~dp0start.py"
if %errorlevel% neq 0 (
    echo.
    echo  ════════════════════════════════════════════════
    echo   ERROR: RIG failed to start properly.
    echo   Try running manually:
    echo     python -m uvicorn app:app --host 127.0.0.1 --port 8000
    echo  ════════════════════════════════════════════════
)

pause
