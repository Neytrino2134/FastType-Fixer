@echo off
echo ==========================================
echo Starting Deployment (Build + Push to GH-Pages)...
echo ==========================================
call npm run deploy
if %errorlevel% neq 0 (
    echo Deployment failed!
    pause
    exit /b %errorlevel%
)
echo.
echo Deployment successful!
pause