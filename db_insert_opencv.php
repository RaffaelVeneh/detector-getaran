<?php
/**
 * Script untuk Insert Data dari OpenCV ke MySQL
 * Dipanggil oleh OpenCV setiap ada data baru
 * 
 * POST /db_insert_opencv.php
 * Body: {
 *   "laptop_id": 1,
 *   "is_a_detected": false,
 *   "is_b_detected": false,
 *   "dista": 110.437,
 *   "distb": 91.3243,
 *   "frequency": 1.5
 * }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/db_config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

// Validate input
$required_fields = ['laptop_id', 'dista', 'distb', 'frequency'];
foreach ($required_fields as $field) {
    if (!isset($input[$field])) {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => "Missing field: $field"]);
        exit;
    }
}

$laptop_id = (int)$input['laptop_id'];
$is_a_detected = isset($input['is_a_detected']) ? (bool)$input['is_a_detected'] : false;
$is_b_detected = isset($input['is_b_detected']) ? (bool)$input['is_b_detected'] : false;
$dista = (float)$input['dista'];
$distb = (float)$input['distb'];
$frequency = (float)$input['frequency'];

// Validate laptop_id
if ($laptop_id < 1 || $laptop_id > 8) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'laptop_id must be 1-8']);
    exit;
}

try {
    // Cek apakah ada session yang running
    $session_query = "SELECT id, started_at, frequency FROM sessions WHERE status = 'running' LIMIT 1";
    $result = $conn->query($session_query);
    $session = $result->fetch_assoc();
    
    $session_id = null;
    $relative_time = null;
    
    if ($session) {
        // Cek apakah frequency cocok dengan session frequency (tolerance ±0.3 Hz)
        $session_freq = (float)$session['frequency'];
        if (abs($frequency - $session_freq) <= 0.3) {
            $session_id = $session['id'];
            
            // Hitung relative time dari started_at
            $started_timestamp = strtotime($session['started_at']);
            $current_timestamp = microtime(true);
            $relative_time = $current_timestamp - $started_timestamp;
            
            // Auto-stop jika sudah 60 detik
            if ($relative_time >= 60) {
                $stop_query = "UPDATE sessions 
                               SET stopped_at = NOW(), 
                                   status = 'stopped',
                                   duration_seconds = 60,
                                   auto_stopped = TRUE
                               WHERE id = ?";
                $stmt = $conn->prepare($stop_query);
                $stmt->bind_param('i', $session_id);
                $stmt->execute();
                
                // Update statistics
                for ($lid = 1; $lid <= 8; $lid++) {
                    $conn->query("CALL update_statistics($session_id, $lid)");
                }
                
                // Set session_id ke null karena sudah stopped
                $session_id = null;
                $relative_time = null;
            }
        }
    }
    
    // Insert data ke realtime_data
    $insert_query = "INSERT INTO realtime_data 
                     (session_id, laptop_id, dista, distb, is_a_detected, is_b_detected, frequency, relative_time, timestamp) 
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(3))";
    
    $stmt = $conn->prepare($insert_query);
    $stmt->bind_param('iiddiidd', $session_id, $laptop_id, $dista, $distb, $is_a_detected, $is_b_detected, $frequency, $relative_time);
    
    if (!$stmt->execute()) {
        throw new Exception("Insert failed: " . $stmt->error);
    }
    
    $insert_id = $stmt->insert_id;
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Data inserted',
        'data_id' => $insert_id,
        'session_id' => $session_id,
        'relative_time' => $relative_time,
        'timestamp' => date('Y-m-d H:i:s.u')
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}

$conn->close();
