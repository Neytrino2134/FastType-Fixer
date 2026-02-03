@echo off
title Neon Player - Electron Dev Mode
color 0b

echo ==================================================
echo      STARTING NEON PLAYER (ELECTRON DEV)
echo ==================================================
echo.
echo Starting Vite server and Electron window...
echo Press Ctrl+C to stop.
echo.

call npm run electron:dev

pause