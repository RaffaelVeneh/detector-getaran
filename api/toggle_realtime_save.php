<?php
/**
 * API: Toggle Realtime Data Saving
 * POST /api/toggle_realtime_save.php
 * Body: { "action": "start|stop", "session_id": 123 } (session_id optional)
 * 
 * Controls whether incoming camera data is accepted/processed
 * Realtime dapat aktif dengan atau tanpa session
 */

header('Content-Type: application/json');
error_reporting(E_ALL);
ini_set('display_errors', 1);

require_once __DIR__ . '/../db_config.php';

// Read JSON input
$input = json_decode(file_get_contents('php://input'), true);

if (!$input || !isset($input['action'])) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Missing required field: action'
    ]);
    exit;
}

$action = $input['action']; // 'start' or 'stop'
$session_id = isset($input['session_id']) ? (int)$input['session_id'] : null; // Optional

// Validate action
if (!in_array($action, ['start', 'stop'])) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid action. Must be "start" or "stop"'
    ]);
    exit;
}

try {
    // Store flag in a simple file (could also use database or Redis)
    $flag_file = __DIR__ . '/../temp/realtime_save_flag.json';
    
    // Ensure temp directory exists
    if (!file_exists(__DIR__ . '/../temp')) {
        mkdir(__DIR__ . '/../temp', 0755, true);
    }
    
    if ($action === 'start') {
        // Enable realtime saving
        $flag_data = [
            'enabled' => true,
            'session_id' => $session_id, // bisa NULL
            'started_at' => date('Y-m-d H:i:s'),
            'timestamp' => time()
        ];
        
        file_put_contents($flag_file, json_encode($flag_data));
        
        $response = [
            'status' => 'success',
            'message' => $session_id ? 'Realtime saving started (with session)' : 'Realtime saving started (no session)',
            'enabled' => true
        ];
        
        if ($session_id) {
            $response['session_id'] = $session_id;
        }
        
        echo json_encode($response);
        
    } else { // stop
        // Disable realtime saving
        $flag_data = [
            'enabled' => false,
            'session_id' => $session_id, // bisa NULL
            'stopped_at' => date('Y-m-d H:i:s'),
            'timestamp' => time()
        ];
        
        file_put_contents($flag_file, json_encode($flag_data));
        
        $response = [
            'status' => 'success',
            'message' => 'Realtime saving stopped',
            'enabled' => false
        ];
        
        if ($session_id) {
            $response['session_id'] = $session_id;
        }
        
        echo json_encode($response);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}

$conn->close();
?>
