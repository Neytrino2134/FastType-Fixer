@echo off
echo ==========================================
echo Initializing Capacitor for Android...
echo ==========================================

echo 1. Installing Capacitor dependencies...
call npm install
if %errorlevel% neq 0 exit /b %errorlevel%

echo.
echo 2. Adding Android Platform...
call npx cap add android
if %errorlevel% neq 0 (
    echo Android platform might already exist or failed to add.
    echo Attempting to sync instead...
)

echo.
echo 3. Building Web Assets and Syncing...
call npm run build
call npx cap sync

echo.
echo ==========================================
echo Initialization Complete!
echo You can now use 8_sync_android.bat or 9_open_studio.bat
echo ==========================================
pause