@echo off
echo ==========================================
echo Building Android Debug APK (Gradle)...
echo ==========================================

if not exist "android" (
    echo Error: 'android' folder not found. Run 7_init_capacitor.bat first.
    pause
    exit /b 1
)

cd android
echo Running Gradle AssembleDebug...
if exist "gradlew.bat" (
    call gradlew.bat assembleDebug
) else (
    echo Error: gradlew.bat not found inside android folder.
    cd ..
    pause
    exit /b 1
)

cd ..
echo.
echo ==========================================
echo Build Process Finished.
echo If successful, APK is located at:
echo android\app\build\outputs\apk\debug\app-debug.apk
echo ==========================================
pause