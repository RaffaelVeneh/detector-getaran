<?php
/**
 * API: Get Team Data by Laptop ID
 * GET /api/tim_X.php (X = 1-8)
 * 
 * Return: JSON data spesifik 1 tim
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../db_config.php';

// Extract laptop_id dari filename (tim_1.php -> 1)
$filename = basename($_SERVER['PHP_SELF']);
preg_match('/tim_(\d+)\.php/', $filename, $matches);
$laptop_id = isset($matches[1]) ? (int)$matches[1] : null;

if (!$laptop_id || $laptop_id < 1 || $laptop_id > 8) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid laptop_id. Must be 1-8.'
    ]);
    exit;
}

try {
    // Get team info
    $team_query = "SELECT * FROM teams WHERE laptop_id = ?";
    $stmt = $conn->prepare($team_query);
    $stmt->bind_param('i', $laptop_id);
    $stmt->execute();
    $team_result = $stmt->get_result();
    $team = $team_result->fetch_assoc();
    
    if (!$team) {
        throw new Exception("Team not found");
    }
    
    // Get latest data grouped by frequency
    $data_query = "SELECT 
                    rd.id,
                    rd.dista,
                    rd.distb,
                    rd.frequency,
                    rd.timestamp,
                    rd.relative_time,
                    rd.session_id,
                    s.status as session_status
                  FROM realtime_data rd
                  LEFT JOIN sessions s ON rd.session_id = s.id
                  WHERE rd.laptop_id = ?
                  ORDER BY rd.timestamp DESC
                  LIMIT 6000"; // Max 6000 points (60 sec * 10 Hz * 10 buffer)
    
    $stmt = $conn->prepare($data_query);
    $stmt->bind_param('i', $laptop_id);
    $stmt->execute();
    $data_result = $stmt->get_result();
    
    $data_by_frequency = [
        '1.5' => [],
        '2.5' => [],
        '3.5' => [],
        '4.5' => [],
        '5.5' => []
    ];
    
    while ($row = $data_result->fetch_assoc()) {
        $freq = number_format((float)$row['frequency'], 1);
        if (isset($data_by_frequency[$freq])) {
            $data_by_frequency[$freq][] = [
                'id' => (int)$row['id'],
                'dista' => (float)$row['dista'],
                'distb' => (float)$row['distb'],
                'timestamp' => $row['timestamp'],
                'relative_time' => (float)($row['relative_time'] ?? 0),
                'session_id' => $row['session_id']
            ];
        }
    }
    
    // Get statistics per frequency
    $stats_query = "SELECT 
                        s.frequency,
                        st.max_dista,
                        st.max_distb,
                        st.avg_dista,
                        st.avg_distb,
                        s.started_at,
                        s.stopped_at,
                        s.duration_seconds,
                        s.status
                    FROM sessions s
                    LEFT JOIN statistics st ON s.id = st.session_id AND st.laptop_id = ?
                    ORDER BY s.id ASC";
    
    $stmt = $conn->prepare($stats_query);
    $stmt->bind_param('i', $laptop_id);
    $stmt->execute();
    $stats_result = $stmt->get_result();
    
    $statistics = [];
    while ($row = $stats_result->fetch_assoc()) {
        $freq = number_format((float)$row['frequency'], 1);
        $statistics[$freq] = [
            'max_dista' => (float)($row['max_dista'] ?? 0),
            'max_distb' => (float)($row['max_distb'] ?? 0),
            'avg_dista' => (float)($row['avg_dista'] ?? 0),
            'avg_distb' => (float)($row['avg_distb'] ?? 0),
            'started_at' => $row['started_at'],
            'stopped_at' => $row['stopped_at'],
            'duration' => (int)($row['duration_seconds'] ?? 0),
            'status' => $row['status']
        ];
    }
    
    // Get current session info
    $session_query = "SELECT * FROM sessions WHERE status = 'running' LIMIT 1";
    $session_result = $conn->query($session_query);
    $current_session = $session_result->fetch_assoc();
    
    echo json_encode([
        'status' => 'success',
        'timestamp' => date('Y-m-d H:i:s'),
        'team' => [
            'laptop_id' => (int)$team['laptop_id'],
            'nama_tim' => $team['nama_tim']
        ],
        'current_session' => $current_session ? [
            'id' => (int)$current_session['id'],
            'frequency' => (float)$current_session['frequency'],
            'started_at' => $current_session['started_at'],
            'elapsed' => time() - strtotime($current_session['started_at'])
        ] : null,
        'data' => $data_by_frequency,
        'statistics' => $statistics
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}

$conn->close();
