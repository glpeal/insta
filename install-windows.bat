@echo off
echo ===================================
echo Instagram DM Panel - Windows Setup
echo ===================================
echo.

echo Checking for administrator rights...
net session >nul 2>&1
if %errorLevel% == 0 (
    echo Running as Administrator - OK
) else (
    echo WARNING: Not running as Administrator
    echo Some operations may fail
    echo Please run this script as Administrator if you encounter errors
    pause
)

echo.
echo Step 1: Stopping any Node.js processes...
taskkill /F /IM node.exe >nul 2>&1

echo Step 2: Navigating to backend directory...
cd /d "%~dp0backend"

echo Step 3: Removing old node_modules...
if exist node_modules (
    echo Removing node_modules directory...
    rmdir /s /q node_modules
)

echo Step 4: Removing package-lock.json...
if exist package-lock.json (
    del /f /q package-lock.json
)

echo Step 5: Clearing npm cache...
call npm cache clean --force

echo Step 6: Verifying package.json has sqlite3 (not better-sqlite3)...
findstr /C:"sqlite3" package.json
if %errorLevel% == 0 (
    echo package.json is correct - using sqlite3
) else (
    echo ERROR: package.json does not contain sqlite3
    echo Please update package.json manually
    pause
    exit /b 1
)

echo.
echo Step 7: Installing dependencies...
echo This may take a few minutes...
echo.

call npm install --no-optional

if %errorLevel% == 0 (
    echo.
    echo ===================================
    echo SUCCESS! Backend dependencies installed
    echo ===================================
    echo.
    echo Next steps:
    echo 1. Copy .env.example to .env
    echo 2. Edit .env with your settings
    echo 3. cd ..\frontend
    echo 4. npm install
    echo 5. Start backend: npm run dev
    echo.
) else (
    echo.
    echo ===================================
    echo ERROR: Installation failed
    echo ===================================
    echo.
    echo Please check the error messages above.
    echo.
    echo Common solutions:
    echo 1. Run this script as Administrator
    echo 2. Close all Node.js processes and try again
    echo 3. Temporarily disable antivirus
    echo 4. Use WSL2 instead of Windows native Node.js
    echo.
)

pause
