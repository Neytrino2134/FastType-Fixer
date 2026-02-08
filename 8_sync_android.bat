@echo off
echo ==========================================
echo Building Web App & Syncing to Android...
echo ==========================================

echo 1. Building Vite Project...
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b %errorlevel%
)

echo.
echo 2. Syncing to Capacitor Android...
call npx cap sync android
if %errorlevel% neq 0 (
    echo Sync failed!
    pause
    exit /b %errorlevel%
)

echo.
echo Done! Changes are now in the 'android' folder.
pause