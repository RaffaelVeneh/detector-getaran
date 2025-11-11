@echo off
REM Quick Test Script for Camera Simulator
REM Run this to test the complete system

echo ============================================================
echo   DETECTOR GETARAN - QUICK SYSTEM TEST
echo ============================================================
echo.

REM Check WebSocket Server
echo [1/4] Checking WebSocket Server...
powershell -Command "if (Test-NetConnection localhost -Port 8080 -InformationLevel Quiet) { Write-Host '  OK: WebSocket server running on port 8080' -ForegroundColor Green } else { Write-Host '  ERROR: WebSocket server not running!' -ForegroundColor Red; Write-Host '  Please run: php websocket_server.php' -ForegroundColor Yellow; exit 1 }"
if errorlevel 1 goto :error
echo.

REM Start new session
echo [2/4] Starting new recording session...
curl -s http://localhost/detector-getaran/start_new_session.php
echo.
echo.

REM Wait for session init
echo [3/4] Waiting for initialization...
ping 127.0.0.1 -n 3 >nul
echo   OK: Session initialized
echo.

REM Run camera simulator for 10 seconds
echo [4/4] Running camera simulator (10 seconds test)...
echo   This will test: API endpoint + WebSocket broadcast
echo   Monitor: ws_output.log for "Broadcasted to X clients"
echo.
python quick_camera_test.py 1 10
echo.

echo ============================================================
echo   TEST COMPLETE
echo ============================================================
echo.
echo Next steps:
echo   1. Check ws_output.log for broadcast messages
echo   2. Open admin_new_v3.html in browser
echo   3. Run again with: test_system.bat
echo.
goto :end

:error
echo.
echo ============================================================
echo   TEST FAILED
echo ============================================================
echo Please check:
echo   1. Laragon is running (Apache + MySQL)
echo   2. WebSocket server: php websocket_server.php
echo   3. Database configured: db_config.php
echo.
exit /b 1

:end
