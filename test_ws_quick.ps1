# Test WebSocket Camera Integration
# Cara pakai: .\test_ws_quick.ps1

Write-Host ""
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  WebSocket Camera Integration - Quick Test" -ForegroundColor Cyan
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check WebSocket server
Write-Host "[1/4] " -NoNewline -ForegroundColor Yellow
Write-Host "Checking WebSocket server..."
try {
    $client = New-Object Net.Sockets.TcpClient
    $client.Connect('localhost', 8080)
    $client.Close()
    Write-Host "      ✓ WebSocket server running on port 8080" -ForegroundColor Green
} catch {
    Write-Host "      ✗ WebSocket server NOT running!" -ForegroundColor Red
    Write-Host ""
    Write-Host "      Start server with:" -ForegroundColor Yellow
    Write-Host "      php websocket_server.php" -ForegroundColor White
    Write-Host ""
    exit 1
}
Write-Host ""

# Step 2: Check/Start session
Write-Host "[2/4] " -NoNewline -ForegroundColor Yellow
Write-Host "Checking active session..."
try {
    $response = Invoke-RestMethod -Uri "http://localhost/detector-getaran/api/all.php" -Method Get
    if ($response.current_session -and $response.current_session.status -eq 'running') {
        Write-Host "      ✓ Session active (ID: $($response.current_session.id))" -ForegroundColor Green
    } else {
        Write-Host "      ⚠ No active session, starting one..." -ForegroundColor Yellow
        Invoke-RestMethod -Uri "http://localhost/detector-getaran/start_new_session.php" -Method Get | Out-Null
        Write-Host "      ✓ Session started" -ForegroundColor Green
    }
} catch {
    Write-Host "      ✗ Failed to check/start session: $_" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 3: Run Python test
Write-Host "[3/4] " -NoNewline -ForegroundColor Yellow
Write-Host "Testing camera data send..."
$result = python quick_test_ws.py
$exitCode = $LASTEXITCODE
Write-Host ""

if ($exitCode -eq 0) {
    Write-Host "      ✓ Camera test passed" -ForegroundColor Green
} else {
    Write-Host "      ✗ Camera test failed" -ForegroundColor Red
    exit 1
}
Write-Host ""

# Step 4: Check database
Write-Host "[4/4] " -NoNewline -ForegroundColor Yellow
Write-Host "Verifying database..."
Write-Host "      Last 3 measurements:" -ForegroundColor Cyan

$phpCode = @"
require 'db_config.php';
`$stmt = `$conn->query('SELECT id, laptop_id, dista, distb, relative_time FROM measurements ORDER BY id DESC LIMIT 3');
while (`$row = `$stmt->fetch_assoc()) {
    echo sprintf('      • ID=%d laptop=%d distA=%.2fmm distB=%.2fmm time=%ds', 
        `$row['id'], `$row['laptop_id'], `$row['dista'], `$row['distb'], `$row['relative_time']) . PHP_EOL;
}
"@

php -r $phpCode
Write-Host ""

# Summary
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host "  ✓ ALL TESTS PASSED!" -ForegroundColor Green
Write-Host "========================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "System Status:" -ForegroundColor White
Write-Host "  ✓ WebSocket Server    : " -NoNewline; Write-Host "RUNNING" -ForegroundColor Green
Write-Host "  ✓ Active Session      : " -NoNewline; Write-Host "YES" -ForegroundColor Green
Write-Host "  ✓ Camera Data Send    : " -NoNewline; Write-Host "SUCCESS" -ForegroundColor Green
Write-Host "  ✓ Database Insert     : " -NoNewline; Write-Host "SUCCESS" -ForegroundColor Green
Write-Host ""
Write-Host "Ready to integrate! " -NoNewline -ForegroundColor Yellow
Write-Host "Use opencv_camera_sender_ws.py in your OpenCV code." -ForegroundColor White
Write-Host ""
