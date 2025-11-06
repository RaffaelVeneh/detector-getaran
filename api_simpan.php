<?php
// Sertakan file konfigurasi database
include 'db_config.php';

// Ambil data JSON mentah dari body request (kiriman alat)
$jsonInput = file_get_contents('php://input');

// Decode JSON menjadi array PHP
$data = json_decode($jsonInput, true);

// Cek apakah data JSON valid dan ada
if ($data) {
    // Ambil nilai dari array (sesuaikan nama 'key' dengan JSON dari alatmu)
    $tingkat_10 = $data['tingkat_10'] ?? null;
    $tingkat_3 = $data['tingkat_3'] ?? null;
    $avg_disp = $data['average_displacement'] ?? null;
    $disp = $data['displacement'] ?? null;

    // Gunakan Prepared Statements untuk keamanan (mencegah SQL Injection)
    $stmt = $conn->prepare("INSERT INTO data_gempa (tingkat_10, tingkat_3, average_displacement, displacement) VALUES (?, ?, ?, ?)");
    
    // 'd' berarti tipe datanya adalah double (desimal)
    $stmt->bind_param("dddd", $tingkat_10, $tingkat_3, $avg_disp, $disp);

    // Eksekusi query
    if ($stmt->execute()) {
        // Jika berhasil, kirim respon sukses
        http_response_code(201); // Created
        echo json_encode(['status' => 'success', 'message' => 'Data berhasil disimpan']);
    } else {
        // Jika gagal
        http_response_code(500); // Internal Server Error
        echo json_encode(['status' => 'error', 'message' => 'Gagal menyimpan data: ' . $stmt->error]);
    }

    $stmt->close();
} else {
    // Jika JSON yang dikirim tidak valid
    http_response_code(400); // Bad Request
    echo json_encode(['status' => 'error', 'message' => 'Data JSON tidak valid']);
}

$conn->close();
?>