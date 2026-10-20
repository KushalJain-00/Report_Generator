@echo off
setlocal
cd /d "%~dp0"
title RIG Windows build

rem ponytail: one-shot build — produces dist\RIG.exe (+ RIG-Setup.exe if Inno Setup found).
rem CI (GitHub Actions) builds the same artifacts on every push; this is the local path.

where py >nul 2>&1
if %errorlevel% equ 0 (set "PY=py -3") else (set "PY=python")

echo   Installing build dependencies...
%PY% -m pip install -q pyinstaller -r requirements.txt
if errorlevel 1 (
    echo   Dependency install failed.
    pause
    exit /b 1
)

echo   Building RIG.exe...
%PY% -m PyInstaller rig.spec --noconfirm --clean
if errorlevel 1 (
    echo   PyInstaller build failed.
    pause
    exit /b 1
)

echo.
echo   Built: dist\RIG.exe

set "ISCC="
where iscc >nul 2>&1 && set "ISCC=iscc"
if not defined ISCC if exist "%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe" set "ISCC=%ProgramFiles(x86)%\Inno Setup 6\ISCC.exe"
if not defined ISCC if exist "%ProgramFiles%\Inno Setup 6\ISCC.exe" set "ISCC=%ProgramFiles%\Inno Setup 6\ISCC.exe"

if defined ISCC (
    echo   Building RIG-Setup.exe...
    "%ISCC%" RIG.iss
    if errorlevel 1 (
        echo   Inno Setup compile failed.
    ) else (
        echo   Built: dist\RIG-Setup.exe
    )
) else (
    echo   Inno Setup not found - skipping installer. RIG.exe alone is portable and works.
)

echo.
pause
