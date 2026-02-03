@echo off
title Neon Player - Deploy to GitHub
color 0b

echo ==================================================
echo      NEON RETRO PLAYER - GITHUB DEPLOY
echo ==================================================
echo.
echo This script will:
echo 1. Build the project (npm run build)
echo 2. Upload the 'dist' folder to 'gh-pages' branch
echo.
echo [!] Make sure you have committed your changes to Git first!
echo.
echo Starting deployment...
echo.

call npm run deploy

if %errorlevel% neq 0 (
    color 0c
    echo.
    echo ==================================================
    echo      ERROR DURING DEPLOYMENT
    echo ==================================================
    echo.
    echo Possible reasons:
    echo - Git is not installed or configured
    echo - No internet connection
    echo - Permissions error on GitHub
    echo.
    pause
    exit
)

color 0a
echo.
echo ==================================================
echo      DEPLOYMENT SUCCESSFUL!
echo ==================================================
echo.
echo Your app will be updated on GitHub Pages shortly.
echo Check the Actions tab on your repo if it takes too long.
echo.
pause