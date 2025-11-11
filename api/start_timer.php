<?php
/**
 * API: Start Timer untuk Frekuensi Baru
 * POST /api/start_timer.php
 * 
 * Body: { "frequency": 1.5 }
 * Return: { "status": "success", "session_id": 123 }
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../db_config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$frequency = isset($input['frequency']) ? (float)$input['frequency'] : null;
$category = isset($input['category']) ? $input['category'] : 'baja';

if (!$frequency || !in_array($frequency, [1.5, 2.5, 3.5, 4.5, 5.5])) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid frequency. Must be 1.5, 2.5, 3.5, 4.5, or 5.5'
    ]);
    exit;
}

if (!in_array($category, ['baja', 'beton'])) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid category. Must be baja or beton'
    ]);
    exit;
}

try {
    // Cek apakah ada session yang masih running
    $check_query = "SELECT id FROM sessions WHERE status = 'running'";
    $result = $conn->query($check_query);
    
    if ($result->num_rows > 0) {
        throw new Exception("Ada session yang masih berjalan. Stop dulu sebelum start baru.");
    }
    
    // Create new session
    $insert_query = "INSERT INTO sessions (frequency, category, started_at, status) VALUES (?, ?, NOW(), 'running')";
    $stmt = $conn->prepare($insert_query);
    $stmt->bind_param('ds', $frequency, $category);
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to create session: " . $stmt->error);
    }
    
    $session_id = $stmt->insert_id;
    
    // Update realtime_data yang belum punya session_id
    $update_query = "UPDATE realtime_data 
                     SET session_id = ?, 
                         relative_time = TIMESTAMPDIFF(MICROSECOND, (SELECT started_at FROM sessions WHERE id = ?), timestamp) / 1000000
                     WHERE session_id IS NULL 
                       AND frequency BETWEEN ? - 0.3 AND ? + 0.3
                       AND timestamp >= (SELECT started_at FROM sessions WHERE id = ?)";
    
    $stmt = $conn->prepare($update_query);
    $stmt->bind_param('iiddi', $session_id, $session_id, $frequency, $frequency, $session_id);
    $stmt->execute();
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Timer started',
        'session_id' => $session_id,
        'frequency' => $frequency,
        'category' => $category,
        'started_at' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}

$conn->close();
