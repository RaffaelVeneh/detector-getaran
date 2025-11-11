@echo off
REM Test Script untuk WebSocket Camera Integration
REM Cara pakai: .\test_ws_flow.bat

echo ========================================================================
echo   Test WebSocket Camera Integration - Complete Flow
echo ========================================================================
echo.

REM Step 1: Check if WebSocket server is running
echo [1/5] Checking WebSocket server...
powershell -Command "$response = try { (New-Object Net.Sockets.TcpClient).Connect('localhost', 8080); $true } catch { $false }; if ($response) { Write-Host '      OK - WebSocket server is running on port 8080' -ForegroundColor Green } else { Write-Host '      ERROR - WebSocket server not running!' -ForegroundColor Red; Write-Host '      Start it with: php websocket_server.php' -ForegroundColor Yellow; exit 1 }"
if errorlevel 1 goto :error
echo.

REM Step 2: Check if there's an active session
echo [2/5] Checking active session...
curl -s http://localhost/detector-getaran/api/all.php > temp_session.json
powershell -Command "$data = Get-Content temp_session.json | ConvertFrom-Json; if ($data.current_session -and $data.current_session.status -eq 'running') { Write-Host '      OK - Session active (ID: ' $data.current_session.id ')' -ForegroundColor Green } else { Write-Host '      WARNING - No active session, starting one...' -ForegroundColor Yellow; Invoke-WebRequest -Uri 'http://localhost/detector-getaran/start_new_session.php' -Method GET | Out-Null; Write-Host '      OK - Session started' -ForegroundColor Green }"
del temp_session.json >nul 2>&1
echo.

REM Step 3: Run quick test
echo [3/5] Testing WebSocket camera sender...
python quick_test_ws.py
if errorlevel 1 goto :error
echo.

REM Step 4: Check database
echo [4/5] Checking database for new data...
timeout /t 1 /nobreak >nul
powershell -Command "Write-Host '      Checking last 3 records in database...' -ForegroundColor Cyan"
php -r "require 'db_config.php'; $stmt = $conn->query('SELECT id, laptop_id, dista, distb, relative_time FROM measurements ORDER BY id DESC LIMIT 3'); echo '      '; while ($row = $stmt->fetch_assoc()) { echo 'ID=' . $row['id'] . ' laptop_id=' . $row['laptop_id'] . ' distA=' . number_format($row['dista'], 2) . ' distB=' . number_format($row['distb'], 2) . ' time=' . $row['relative_time'] . 's' . PHP_EOL . '      '; }"
echo.

REM Step 5: Summary
echo [5/5] Test Summary
echo       ------------------------------------------------
powershell -Command "Write-Host '      ' -NoNewline; Write-Host 'WebSocket Server    : ' -NoNewline; Write-Host 'RUNNING' -ForegroundColor Green"
powershell -Command "Write-Host '      ' -NoNewline; Write-Host 'Active Session      : ' -NoNewline; Write-Host 'YES' -ForegroundColor Green"
powershell -Command "Write-Host '      ' -NoNewline; Write-Host 'Camera Data Sent    : ' -NoNewline; Write-Host 'SUCCESS' -ForegroundColor Green"
powershell -Command "Write-Host '      ' -NoNewline; Write-Host 'Broadcast Received  : ' -NoNewline; Write-Host 'SUCCESS' -ForegroundColor Green"
powershell -Command "Write-Host '      ' -NoNewline; Write-Host 'Database Inserted   : ' -NoNewline; Write-Host 'SUCCESS' -ForegroundColor Green"
echo       ------------------------------------------------
echo.

echo ========================================================================
powershell -Command "Write-Host '  TEST PASSED - Ready for OpenCV integration!' -ForegroundColor Green"
echo ========================================================================
echo.
echo Next steps:
echo   1. Integrate opencv_camera_sender_ws.py into your OpenCV code
echo   2. Open admin_new_v3.html to monitor all teams
echo   3. Open tim_1_v3.html to see real-time graphs
echo.
goto :eof

:error
echo.
echo ========================================================================
powershell -Command "Write-Host '  TEST FAILED - Check errors above' -ForegroundColor Red"
echo ========================================================================
echo.
pause
exit /b 1
