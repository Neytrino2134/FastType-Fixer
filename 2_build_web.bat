@echo off
echo ==========================================
echo Installing Dependencies...
echo ==========================================
call npm install
if %errorlevel% neq 0 (
    echo Error installing dependencies!
    pause
    exit /b %errorlevel%
)

echo ==========================================
echo Building Web Application...
echo ==========================================
call npm run build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b %errorlevel%
)
echo.
echo Web build complete! Files are in the 'dist' folder.
pause