<?php
/**
 * API: Stop Timer
 * POST /api/stop_timer.php
 * 
 * Body: { "session_id": 123, "auto_stopped": false }
 * Return: { "status": "success" }
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
$session_id = isset($input['session_id']) ? (int)$input['session_id'] : null;
$auto_stopped = isset($input['auto_stopped']) ? (bool)$input['auto_stopped'] : false;

try {
    if (!$session_id) {
        // Jika tidak ada session_id, ambil session yang running
        $query = "SELECT id FROM sessions WHERE status = 'running' LIMIT 1";
        $result = $conn->query($query);
        if ($result->num_rows > 0) {
            $row = $result->fetch_assoc();
            $session_id = $row['id'];
        } else {
            throw new Exception("No running session found");
        }
    }
    
    // Get session info
    $info_query = "SELECT started_at, frequency FROM sessions WHERE id = ?";
    $stmt = $conn->prepare($info_query);
    $stmt->bind_param('i', $session_id);
    $stmt->execute();
    $result = $stmt->get_result();
    $session = $result->fetch_assoc();
    
    if (!$session) {
        throw new Exception("Session not found");
    }
    
    // Calculate duration
    $duration = time() - strtotime($session['started_at']);
    
    // Update session status
    $update_query = "UPDATE sessions 
                     SET stopped_at = NOW(), 
                         status = 'stopped',
                         duration_seconds = ?,
                         auto_stopped = ?
                     WHERE id = ?";
    
    $stmt = $conn->prepare($update_query);
    $stmt->bind_param('iii', $duration, $auto_stopped, $session_id);
    
    if (!$stmt->execute()) {
        throw new Exception("Failed to stop session: " . $stmt->error);
    }
    
    // Update statistics untuk semua tim di session ini
    for ($laptop_id = 1; $laptop_id <= 8; $laptop_id++) {
        $conn->query("CALL update_statistics($session_id, $laptop_id)");
    }
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Timer stopped',
        'session_id' => $session_id,
        'frequency' => (float)$session['frequency'],
        'duration_seconds' => $duration,
        'auto_stopped' => $auto_stopped,
        'stopped_at' => date('Y-m-d H:i:s')
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}

$conn->close();
