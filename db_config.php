<?php
// ===== KONFIGURASI DATABASE =====
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "db_detector_getaran";

// Buat koneksi
$conn = new mysqli($servername, $username, $password, $dbname);

// Cek koneksi
if ($conn->connect_error) {
    die("Koneksi gagal: " . $conn->connect_error);
}

// Set charset UTF-8
$conn->set_charset("utf8mb4");
?>