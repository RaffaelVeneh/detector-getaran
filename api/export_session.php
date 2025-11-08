<?php
/**
 * API: Export Session Data to CSV (Start-Stop recordings)
 * GET /api/export_session.php?laptop_id=1&frequency=1.5 (optional filters)
 * 
 * Return: CSV file download
 */

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="session_data_' . date('Y-m-d_His') . '.csv"');

require_once __DIR__ . '/../db_config.php';

$laptop_id = isset($_GET['laptop_id']) ? (int)$_GET['laptop_id'] : null;
$frequency = isset($_GET['frequency']) ? (float)$_GET['frequency'] : null;

try {
    $query = "SELECT 
                t.laptop_id,
                t.nama_tim as Team_Name,
                s.frequency as Frequency,
                rd.relative_time as Waktu_Detik,
                rd.dista as Realtime_Disp_A,
                rd.distb as Realtime_Disp_B,
                st.max_dista as Max_Disp_A,
                st.max_distb as Max_Disp_B,
                st.avg_dista as Avg_Disp_A,
                st.avg_distb as Avg_Disp_B,
                s.started_at,
                s.stopped_at
              FROM sessions s
              INNER JOIN realtime_data rd ON s.id = rd.session_id
              INNER JOIN teams t ON rd.laptop_id = t.laptop_id
              LEFT JOIN statistics st ON s.id = st.session_id AND t.laptop_id = st.laptop_id
              WHERE s.status IN ('stopped', 'completed')";
    
    if ($laptop_id) {
        $query .= " AND rd.laptop_id = " . $laptop_id;
    }
    
    if ($frequency) {
        $query .= " AND s.frequency = " . $frequency;
    }
    
    $query .= " ORDER BY s.id ASC, t.laptop_id ASC, rd.relative_time ASC";
    
    $result = $conn->query($query);
    
    if (!$result) {
        throw new Exception("Query error: " . $conn->error);
    }
    
    // Output CSV header
    $output = fopen('php://output', 'w');
    fputcsv($output, [
        'Laptop_ID',
        'Team_Name',
        'Waktu_Detik',
        'Avg_Disp_A_mm_per_s',
        'Max_Disp_A_mm',
        'Realtime_Disp_A_mm',
        'Avg_Disp_B_mm_per_s',
        'Max_Disp_B_mm',
        'Realtime_Disp_B_mm',
        'Frequency_Hz',
        'Started_At',
        'Stopped_At'
    ]);
    
    // Format waktu relatif sebagai MM:SS
    while ($row = $result->fetch_assoc()) {
        $seconds = (int)$row['Waktu_Detik'];
        $minutes = floor($seconds / 60);
        $secs = $seconds % 60;
        $time_formatted = sprintf('%02d:%02d', $minutes, $secs);
        
        fputcsv($output, [
            $row['laptop_id'],
            $row['Team_Name'],
            $time_formatted,
            number_format($row['Avg_Disp_A'] ?? 0, 4),
            number_format($row['Max_Disp_A'] ?? 0, 4),
            number_format($row['Realtime_Disp_A'], 4),
            number_format($row['Avg_Disp_B'] ?? 0, 4),
            number_format($row['Max_Disp_B'] ?? 0, 4),
            number_format($row['Realtime_Disp_B'], 4),
            number_format($row['Frequency'], 1),
            $row['started_at'],
            $row['stopped_at']
        ]);
    }
    
    fclose($output);
    
} catch (Exception $e) {
    echo "# Error: " . $e->getMessage() . "\n";
}

$conn->close();
