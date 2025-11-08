<?php
/**
 * API: Export Realtime Data to CSV
 * GET /api/export_realtime.php?laptop_id=1 (optional, untuk per tim)
 * GET /api/export_realtime.php (untuk semua tim)
 * 
 * Return: CSV file download
 */

header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="realtime_data_' . date('Y-m-d_His') . '.csv"');

require_once __DIR__ . '/../db_config.php';

$laptop_id = isset($_GET['laptop_id']) ? (int)$_GET['laptop_id'] : null;

try {
    $query = "SELECT 
                t.laptop_id,
                t.nama_tim as Team_Name,
                rd.timestamp as Timestamp,
                rd.dista as Realtime_Disp_A,
                rd.distb as Realtime_Disp_B,
                rd.frequency as Frequency,
                st.max_dista as Max_Disp_A,
                st.max_distb as Max_Disp_B,
                st.avg_dista as Avg_Disp_A,
                st.avg_distb as Avg_Disp_B
              FROM realtime_data rd
              INNER JOIN teams t ON rd.laptop_id = t.laptop_id
              LEFT JOIN sessions s ON rd.session_id = s.id
              LEFT JOIN statistics st ON s.id = st.session_id AND t.laptop_id = st.laptop_id";
    
    if ($laptop_id) {
        $query .= " WHERE rd.laptop_id = " . $laptop_id;
    }
    
    $query .= " ORDER BY rd.timestamp ASC";
    
    $result = $conn->query($query);
    
    if (!$result) {
        throw new Exception("Query error: " . $conn->error);
    }
    
    // Output CSV header
    $output = fopen('php://output', 'w');
    fputcsv($output, [
        'Laptop_ID',
        'Team_Name',
        'Timestamp',
        'Realtime_Disp_A_mm',
        'Max_Disp_A_mm',
        'Avg_Disp_A_mm_per_s',
        'Realtime_Disp_B_mm',
        'Max_Disp_B_mm',
        'Avg_Disp_B_mm_per_s',
        'Frequency_Hz'
    ]);
    
    // Output data rows
    while ($row = $result->fetch_assoc()) {
        fputcsv($output, [
            $row['laptop_id'],
            $row['Team_Name'],
            $row['Timestamp'],
            number_format($row['Realtime_Disp_A'], 4),
            number_format($row['Max_Disp_A'] ?? 0, 4),
            number_format($row['Avg_Disp_A'] ?? 0, 4),
            number_format($row['Realtime_Disp_B'], 4),
            number_format($row['Max_Disp_B'] ?? 0, 4),
            number_format($row['Avg_Disp_B'] ?? 0, 4),
            number_format($row['Frequency'], 1)
        ]);
    }
    
    fclose($output);
    
} catch (Exception $e) {
    // Output error sebagai CSV comment
    echo "# Error: " . $e->getMessage() . "\n";
}

$conn->close();
