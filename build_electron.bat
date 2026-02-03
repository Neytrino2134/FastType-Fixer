@echo off
title Neon Player - Building Electron App
color 0a

echo ==================================================
echo      BUILDING NEON PLAYER (ELECTRON)
echo ==================================================
echo.
echo This will compile the React app and package it
echo into an executable (.exe) in the 'dist-electron' folder.
echo.
echo Please wait, this may take a few minutes...
echo.

call npm run electron:build

if %errorlevel% neq 0 (
    color 0c
    echo.
    echo ==================================================
    echo      BUILD FAILED
    echo ==================================================
    echo Check the error messages above.
    pause
    exit
)

echo.
echo ==================================================
echo      BUILD SUCCESSFUL!
echo ==================================================
echo Your application is ready in the 'dist-electron' folder.
echo.
pause