<?php
/**
 * API: Get Realtime Status
 * Returns current realtime saving status from flag file
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$flag_file = __DIR__ . '/../temp/realtime_save_flag.json';

// Check if flag file exists
if (!file_exists($flag_file)) {
    echo json_encode([
        'status' => 'success',
        'enabled' => false,
        'session_id' => null,
        'message' => 'No active realtime saving'
    ]);
    exit;
}

// Read flag file
$flag_data = json_decode(file_get_contents($flag_file), true);

if (!$flag_data) {
    echo json_encode([
        'status' => 'success',
        'enabled' => false,
        'session_id' => null,
        'message' => 'Invalid flag file'
    ]);
    exit;
}

// Return current status
echo json_encode([
    'status' => 'success',
    'enabled' => $flag_data['enabled'] ?? false,
    'session_id' => $flag_data['session_id'] ?? null,
    'started_at' => $flag_data['started_at'] ?? null,
    'message' => 'Realtime status retrieved'
]);
?>
