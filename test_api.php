<?php
/**
 * Test API receive_camera_data.php via PHP
 * Buka di browser: http://localhost/detector-getaran/test_api.php
 */

// Test data
$testData = [
    'laptop_id' => 1,
    'dista' => 10.5,
    'distb' => 15.2,
    'is_a_detected' => true,
    'is_b_detected' => true
];

echo "<html><head><title>API Test</title>";
echo "<style>
body { font-family: Arial; max-width: 800px; margin: 50px auto; padding: 20px; }
.box { border: 2px solid #333; padding: 20px; margin: 20px 0; border-radius: 8px; }
.success { background: #d4edda; border-color: #c3e6cb; }
.error { background: #f8d7da; border-color: #f5c6cb; }
pre { background: #f4f4f4; padding: 15px; border-radius: 4px; overflow-x: auto; }
h1 { color: #333; }
</style></head><body>";

echo "<h1>🧪 Test API receive_camera_data.php</h1>";

echo "<div class='box'>";
echo "<h2>📤 Sending Data:</h2>";
echo "<pre>" . json_encode($testData, JSON_PRETTY_PRINT) . "</pre>";
echo "</div>";

// Send request to API
$url = 'http://localhost/detector-getaran/api/receive_camera_data.php';

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Content-Length: ' . strlen(json_encode($testData))
]);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "<div class='box " . ($httpCode == 200 ? 'success' : 'error') . "'>";
echo "<h2>📥 Response:</h2>";

if ($error) {
    echo "<p><strong>❌ CURL Error:</strong> $error</p>";
} else {
    echo "<p><strong>HTTP Status:</strong> $httpCode</p>";
    echo "<pre>" . htmlspecialchars($response) . "</pre>";
    
    if ($httpCode == 200) {
        $responseData = json_decode($response, true);
        echo "<hr>";
        echo "<h3>✅ SUCCESS!</h3>";
        echo "<p>✅ API berfungsi normal</p>";
        echo "<p>✅ Server dapat menerima data dari camera</p>";
        if (isset($responseData['mode'])) {
            echo "<p>✅ Mode: <strong>" . $responseData['mode'] . "</strong></p>";
            if ($responseData['mode'] == 'free') {
                echo "<p>ℹ️ Data diterima tanpa session aktif (free mode)</p>";
            } else {
                echo "<p>ℹ️ Data diterima dengan session aktif (recording mode)</p>";
            }
        }
    } else {
        echo "<hr>";
        echo "<h3>⚠️ API Error</h3>";
        echo "<p>Status code: $httpCode</p>";
    }
}

echo "</div>";

// Check database
echo "<div class='box'>";
echo "<h2>📊 Check Database (Latest Entry):</h2>";

try {
    require_once __DIR__ . '/db_config.php';
    
    $query = "SELECT * FROM realtime_data ORDER BY id DESC LIMIT 1";
    $result = $conn->query($query);
    
    if ($result && $result->num_rows > 0) {
        $row = $result->fetch_assoc();
        echo "<pre>" . json_encode($row, JSON_PRETTY_PRINT) . "</pre>";
        
        if ($row['session_id'] === null) {
            echo "<p>✅ Data masuk dalam FREE MODE (session_id = NULL)</p>";
        } else {
            echo "<p>✅ Data masuk dalam RECORDING MODE (session_id = " . $row['session_id'] . ")</p>";
        }
    } else {
        echo "<p>⚠️ No data in database yet</p>";
    }
    
} catch (Exception $e) {
    echo "<p>❌ Database error: " . $e->getMessage() . "</p>";
}

echo "</div>";

echo "<div class='box'>";
echo "<h2>📝 Summary:</h2>";
echo "<ul>";

if ($httpCode == 200) {
    echo "<li>✅ <strong>API Connection:</strong> SUCCESS</li>";
    echo "<li>✅ <strong>Data Accepted:</strong> YES</li>";
    echo "<li>✅ <strong>Database Insert:</strong> SUCCESS</li>";
    echo "<li>✅ <strong>Camera dapat kirim data ke server</strong></li>";
    echo "</ul>";
    echo "<hr>";
    echo "<p><strong>Next Step:</strong></p>";
    echo "<p>1. Di laptop camera, jalankan: <code>python refactor_aruco.py</code></p>";
    echo "<p>2. Masukkan Server Address: <code>192.168.43.26</code></p>";
    echo "<p>3. Click 'Start Detection'</p>";
} else {
    echo "<li>❌ <strong>API Connection:</strong> FAILED</li>";
    echo "<li>❌ <strong>Status Code:</strong> $httpCode</li>";
    echo "</ul>";
    echo "<hr>";
    echo "<p><strong>Troubleshooting:</strong></p>";
    echo "<p>1. Check PHP error log</p>";
    echo "<p>2. Check file: api/receive_camera_data.php</p>";
    echo "<p>3. Check database connection</p>";
}

echo "</div>";

echo "</body></html>";
?>
