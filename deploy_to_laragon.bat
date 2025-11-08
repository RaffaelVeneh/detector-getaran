@echo off
REM ===== DEPLOY DETECTOR GETARAN V2 TO LARAGON =====
REM Run this script from Laragon Terminal (Menu -> Terminal)

echo.
echo ========================================
echo   DEPLOY DETECTOR GETARAN V2
echo ========================================
echo.

REM Check if running from correct directory
if not exist "composer.json" (
    echo ERROR: composer.json not found!
    echo Please run this script from: C:\laragon\www\detector-getaran\
    pause
    exit /b 1
)

echo [1/4] Installing Composer Dependencies...
echo ----------------------------------------
composer install
if errorlevel 1 (
    echo.
    echo ERROR: Composer install failed!
    echo Make sure you run this from Laragon Terminal.
    echo.
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Composer dependencies installed!
echo.
echo Installed packages:
dir /b vendor 2>nul

echo.
echo ========================================
echo [2/4] Database Setup Required
echo ========================================
echo.
echo Please complete these steps manually:
echo.
echo 1. Open phpMyAdmin: http://localhost/phpmyadmin
echo 2. Login: root / asya2105
echo 3. Select database: db_detector_getaran
echo 4. Click Import tab
echo 5. Choose file: C:\laragon\www\detector-getaran\database_v2.sql
echo 6. Click Go
echo.
echo 7. After import success, run this SQL:
echo.
echo    INSERT INTO teams (laptop_id, nama_tim) VALUES
echo    (1, 'Tim 1'), (2, 'Tim 2'), (3, 'Tim 3'), (4, 'Tim 4'),
echo    (5, 'Tim 5'), (6, 'Tim 6'), (7, 'Tim 7'), (8, 'Tim 8');
echo.
echo ----------------------------------------
set /p db_done="Press ENTER after database setup is complete..."

echo.
echo ========================================
echo [3/4] Verify Database Connection
echo ========================================
echo.
php -r "echo 'Testing database connection...' . PHP_EOL; $conn = new mysqli('localhost', 'root', 'asya2105', 'db_detector_getaran'); if ($conn->connect_error) { echo 'ERROR: ' . $conn->connect_error . PHP_EOL; exit(1); } else { echo 'SUCCESS: Database connected!' . PHP_EOL; $result = $conn->query('SELECT COUNT(*) as count FROM teams'); $row = $result->fetch_assoc(); echo 'Teams in database: ' . $row['count'] . PHP_EOL; }"

if errorlevel 1 (
    echo.
    echo WARNING: Database connection failed!
    echo Please check db_config.php and database setup.
    echo.
    pause
)

echo.
echo ========================================
echo [4/4] Start WebSocket Server
echo ========================================
echo.
echo WebSocket server will start on port 8080
echo Press Ctrl+C to stop the server
echo.
echo IMPORTANT: Keep this terminal window open!
echo.
pause

echo.
echo Starting WebSocket Server...
echo ----------------------------------------
php websocket_server.php

REM This line won't be reached until server stops
echo.
echo WebSocket server stopped.
pause
