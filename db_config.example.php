<?php
// ===== CONTOH KONFIGURASI DATABASE =====
// Salin file ini sebagai db_config.php dan sesuaikan dengan konfigurasi Anda

$servername = "localhost";
$username = "root";
$password = "asya2105"; // Kosongkan jika tidak ada password
$dbname = "db_detector_getaran";

// Buat koneksi
$conn = new mysqli($servername, $username, $password, $dbname);

// Cek koneksi
if ($conn->connect_error) {
    die("Koneksi gagal: " . $conn->connect_error);
}

// Set charset ke UTF-8
$conn->set_charset("utf8mb4");
?>
