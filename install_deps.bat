@echo off
echo ==========================================
echo Installing Dependencies (npm install)...
echo ==========================================
call npm install
if %errorlevel% neq 0 (
    echo Error installing dependencies!
    pause
    exit /b %errorlevel%
)
echo.
echo Dependencies installed successfully.
pause