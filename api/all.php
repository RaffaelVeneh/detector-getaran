<?php
/**
 * API: Get All Teams Data
 * GET /api/all
 * 
 * Return: JSON semua tim dengan data terbaru
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../db_config.php';

try {
    // Get data terbaru dari semua tim
    $query = "SELECT 
                t.laptop_id,
                t.nama_tim,
                rd.dista as realtime_dista,
                rd.distb as realtime_distb,
                rd.frequency as current_frequency,
                rd.timestamp as last_update,
                st.max_dista,
                st.max_distb,
                st.avg_dista,
                st.avg_distb,
                s.id as session_id,
                s.frequency as session_frequency,
                s.status as session_status,
                s.started_at,
                TIMESTAMPDIFF(SECOND, s.started_at, NOW()) as elapsed_seconds
              FROM teams t
              LEFT JOIN (
                  SELECT laptop_id, dista, distb, frequency, timestamp
                  FROM realtime_data
                  WHERE id IN (
                      SELECT MAX(id) 
                      FROM realtime_data 
                      GROUP BY laptop_id
                  )
              ) rd ON t.laptop_id = rd.laptop_id
              LEFT JOIN sessions s ON s.status = 'running'
              LEFT JOIN statistics st ON s.id = st.session_id AND t.laptop_id = st.laptop_id
              ORDER BY t.laptop_id ASC";
    
    $result = $conn->query($query);
    
    if (!$result) {
        throw new Exception("Query error: " . $conn->error);
    }
    
    $teams = [];
    while ($row = $result->fetch_assoc()) {
        $teams[] = [
            'laptop_id' => (int)$row['laptop_id'],
            'nama_tim' => $row['nama_tim'],
            'realtime' => [
                'dista' => (float)($row['realtime_dista'] ?? 0),
                'distb' => (float)($row['realtime_distb'] ?? 0),
                'frequency' => (float)($row['current_frequency'] ?? 0),
                'timestamp' => $row['last_update']
            ],
            'statistics' => [
                'max_dista' => (float)($row['max_dista'] ?? 0),
                'max_distb' => (float)($row['max_distb'] ?? 0),
                'avg_dista' => (float)($row['avg_dista'] ?? 0),
                'avg_distb' => (float)($row['avg_distb'] ?? 0)
            ],
            'session' => [
                'id' => $row['session_id'],
                'frequency' => (float)($row['session_frequency'] ?? 0),
                'status' => $row['session_status'],
                'started_at' => $row['started_at'],
                'elapsed_seconds' => (int)($row['elapsed_seconds'] ?? 0)
            ]
        ];
    }
    
    echo json_encode([
        'status' => 'success',
        'timestamp' => date('Y-m-d H:i:s'),
        'count' => count($teams),
        'data' => $teams
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}

$conn->close();
