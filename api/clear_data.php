<?php
/**
 * Clear/Reset Data API
 * Menghapus semua realtime_data dan statistics untuk testing/percobaan ulang
 * TIDAK menghapus: teams, categories, sessions (hanya update status)
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../db_config.php';

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

try {
    // Start transaction
    $conn->begin_transaction();
    
    // 1. Get counts before deletion (untuk report)
    $result = $conn->query("SELECT COUNT(*) as count FROM realtime_data");
    $realtime_count = $result->fetch_assoc()['count'];
    
    $result = $conn->query("SELECT COUNT(*) as count FROM statistics");
    $stats_count = $result->fetch_assoc()['count'];
    
    $result = $conn->query("SELECT COUNT(*) as count FROM sessions WHERE status = 'running'");
    $active_sessions = $result->fetch_assoc()['count'];
    
    // 2. Stop all running sessions
    $conn->query("UPDATE sessions SET status = 'stopped', stopped_at = NOW() WHERE status = 'running'");
    
    // 3. Delete all realtime_data (CASCADE will delete statistics automatically)
    $conn->query("DELETE FROM realtime_data");
    
    // 4. Delete all statistics (just to be sure)
    $conn->query("DELETE FROM statistics");
    
    // 5. Reset AUTO_INCREMENT (optional - start from 1 again)
    $conn->query("ALTER TABLE realtime_data AUTO_INCREMENT = 1");
    $conn->query("ALTER TABLE statistics AUTO_INCREMENT = 1");
    
    // Commit transaction
    $conn->commit();
    
    // Delete broadcast queue file if exists
    $queue_file = '../temp/broadcast_queue.jsonl';
    if (file_exists($queue_file)) {
        unlink($queue_file);
    }
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'All data cleared successfully',
        'deleted' => [
            'realtime_data' => $realtime_count,
            'statistics' => $stats_count,
            'stopped_sessions' => $active_sessions,
            'broadcast_queue' => file_exists($queue_file) ? 'cleared' : 'not found'
        ],
        'preserved' => [
            'teams' => 'kept',
            'categories' => 'kept',
            'sessions_history' => 'kept (status updated to stopped)'
        ],
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
} catch (Exception $e) {
    // Rollback on error
    $conn->rollback();
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to clear data',
        'message' => $e->getMessage()
    ]);
}

$conn->close();
