@echo off
title Neon Player - Installation
color 0b

echo ==================================================
echo      NEON RETRO PLAYER - INSTALLATION SETUP
echo ==================================================
echo.
echo [1/2] Checking for Node.js...
where node >nul 2>nul
if %errorlevel% neq 0 (
    color 0c
    echo Error: Node.js is not installed!
    echo Please download and install it from https://nodejs.org/
    pause
    exit
)
echo Node.js found.
echo.
echo [2/2] Installing dependencies (npm install)...
echo This might take a few minutes.
echo.

call npm install --legacy-peer-deps

if %errorlevel% neq 0 (
    color 0c
    echo.
    echo ==================================================
    echo      ERROR DURING INSTALLATION
    echo ==================================================
    pause
    exit
)

color 0a
echo.
echo ==================================================
echo      INSTALLATION COMPLETE!
echo ==================================================
echo You can now run 'start.bat' to launch the player.
echo.
pause