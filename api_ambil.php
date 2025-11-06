<?php
// Sertakan file konfigurasi database
include 'db_config.php';

// Ambil data terbaru (misalnya 50 data terakhir)
$sql = "SELECT waktu, tingkat_10, tingkat_3, average_displacement, displacement 
        FROM data_gempa 
        ORDER BY waktu DESC 
        LIMIT 50";

$result = $conn->query($sql);

$data = [];
if ($result->num_rows > 0) {
    // Ambil data baris per baris
    while($row = $result->fetch_assoc()) {
        $data[] = $row;
    }
}

$conn->close();

// Set header agar browser tahu ini adalah JSON
header('Content-Type: application/json');

// Tampilkan data dalam format JSON
echo json_encode($data);
?>