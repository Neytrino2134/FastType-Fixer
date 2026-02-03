@echo off
title Neon Player - DEEP CLEAN AND BUILD
color 0e

echo ==================================================
echo      NEON RETRO PLAYER - FULL CLEAN BUILD
echo ==================================================
echo.
echo WARNING: This script will delete:
echo  - node_modules (Dependencies)
echo  - dist (Previous builds)
echo  - package-lock.json
echo.
echo Step 1 of 3: Cleaning old files...

if exist dist rd /s /q dist
if exist dist-electron rd /s /q dist-electron
if exist node_modules rd /s /q node_modules
if exist package-lock.json del /f /q package-lock.json

echo.
echo Step 2 of 3: Installing fresh dependencies...
echo This will take a few minutes...
echo.

call npm install --legacy-peer-deps

if %errorlevel% neq 0 (
    color 0c
    echo.
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    echo      INSTALLATION FAILED
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    pause
    exit /b %errorlevel%
)

echo.
echo Step 3 of 3: Building project...
echo.

call npm run build

if %errorlevel% neq 0 (
    color 0c
    echo.
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    echo      BUILD FAILED
    echo !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
    pause
    exit /b %errorlevel%
)

color 0a
echo.
echo ==================================================
echo      CLEAN BUILD SUCCESSFUL!
echo ==================================================
echo.
pause