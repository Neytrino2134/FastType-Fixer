@echo off
echo ==========================================
echo HARD RESET: Fixing Android Build...
echo This will delete 'android' folder and recreate it.
echo ==========================================

echo IMPORTANT: Close Android Studio before continuing!
pause

call node scripts/fix_android_build.js

echo.
echo ==========================================
echo Fixes applied!
echo 1. Run "9_open_android_studio.bat"
echo 2. Wait for Gradle Sync to finish (bottom bar).
echo 3. Press 'Play' (Run) in Android Studio.
echo ==========================================
pause