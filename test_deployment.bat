@echo off
REM ===== TEST DEPLOYMENT - SEND DUMMY DATA =====
REM Run this after WebSocket server is running

echo.
echo ========================================
echo   TEST DEPLOYMENT - Dummy Data
echo ========================================
echo.

echo This script will:
echo - Send 10 dummy data points to database
echo - Simulate OpenCV data from laptop 1
echo - Test frequency: 1.5 Hz
echo.
pause

echo.
echo Starting data injection...
echo ----------------------------------------

REM Create temporary PHP script
echo ^<?php > test_data.php
echo $url = "http://localhost/detector-getaran/db_insert_opencv.php"; >> test_data.php
echo. >> test_data.php
echo for ($i = 1; $i ^<= 10; $i++) { >> test_data.php
echo     $data = json_encode([ >> test_data.php
echo         'laptop_id' =^> 1, >> test_data.php
echo         'is_a_detected' =^> 1, >> test_data.php
echo         'is_b_detected' =^> 1, >> test_data.php
echo         'dista' =^> rand(10, 100) / 10.0, >> test_data.php
echo         'distb' =^> rand(10, 100) / 10.0, >> test_data.php
echo         'frequency' =^> 1.5 >> test_data.php
echo     ]); >> test_data.php
echo. >> test_data.php
echo     $ch = curl_init($url); >> test_data.php
echo     curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); >> test_data.php
echo     curl_setopt($ch, CURLOPT_POST, true); >> test_data.php
echo     curl_setopt($ch, CURLOPT_POSTFIELDS, $data); >> test_data.php
echo     curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']); >> test_data.php
echo. >> test_data.php
echo     $response = curl_exec($ch); >> test_data.php
echo     $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE); >> test_data.php
echo     curl_close($ch); >> test_data.php
echo. >> test_data.php
echo     echo "[$i/10] HTTP $http_code - $response\n"; >> test_data.php
echo     sleep(1); >> test_data.php
echo } >> test_data.php
echo. >> test_data.php
echo echo "\n========================================\n"; >> test_data.php
echo echo "Test complete! Check:\n"; >> test_data.php
echo echo "- Admin: http://localhost/detector-getaran/admin_new.html\n"; >> test_data.php
echo echo "- Tim 1: http://localhost/detector-getaran/tim_1.html\n"; >> test_data.php
echo ?^> >> test_data.php

php test_data.php

del test_data.php

echo.
pause
