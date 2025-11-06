<?php
$servername = "localhost";
$username = "root";
$password = "rnudFQMehsHbW0F";
$dbname = "db_detector_getaran";

// Buat koneksi
$conn = new mysqli($servername, $username, $password, $dbname);

// Cek koneksi
if ($conn->connect_error) {
    die("Koneksi gagal: " . $conn->connect_error);
}
?>