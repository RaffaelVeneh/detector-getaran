<?php
// ===============================================
// API SAVE TEST - Simpan Data Pengujian ke MySQL
// Data ini diambil dari data.json yang dibaca frontend
// ===============================================
include 'db_config.php';

header('Content-Type: application/json');

// Ambil data JSON dari body request
$jsonInput = file_get_contents('php://input');
$data = json_decode($jsonInput, true);

if (!$data) {
    echo json_encode(['status' => 'error', 'message' => 'Data JSON tidak valid']);
    exit;
}

$team_id = $data['team_id'] ?? 0;
$frequency = $data['frequency'] ?? 1;
$session_id = $data['session_id'] ?? 0;
$g3t_data = $data['g3t_data'] ?? null;
$g10t_data = $data['g10t_data'] ?? null;

if ($team_id <= 0 || !$g3t_data || !$g10t_data) {
    echo json_encode(['status' => 'error', 'message' => 'Data tidak lengkap']);
    exit;
}

// Jika session_id tidak ada, buat session baru
if ($session_id <= 0) {
    $sql = "INSERT INTO test_sessions (team_id, frekuensi_ke, status) VALUES (?, ?, 'running')";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ii", $team_id, $frequency);
    
    if ($stmt->execute()) {
        $session_id = $stmt->insert_id;
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Gagal membuat sesi: ' . $stmt->error]);
        exit;
    }
    $stmt->close();
}

// Simpan data ke database
$sql = "INSERT INTO test_data (
    session_id,
    team_id, 
    frekuensi_ke, 
    waktu_detik, 
    g3t_displacement, 
    g3t_max_disp, 
    g3t_avg_disp, 
    g10t_displacement, 
    g10t_max_disp, 
    g10t_avg_disp
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    echo json_encode(['status' => 'error', 'message' => 'Gagal prepare statement: ' . $conn->error]);
    exit;
}

$successCount = 0;
$errorCount = 0;

// Simpan semua data point
$dataLength = count($g3t_data['times']);

for ($i = 0; $i < $dataLength; $i++) {
    $waktu_detik = $g3t_data['times'][$i];
    
    $g3t_displacement = $g3t_data['displacements'][$i];
    $g3t_max_disp = $g3t_data['maxDisp'];
    $g3t_avg_disp = $g3t_data['avgDisp'];
    
    $g10t_displacement = $g10t_data['displacements'][$i] ?? 0;
    $g10t_max_disp = $g10t_data['maxDisp'];
    $g10t_avg_disp = $g10t_data['avgDisp'];
    
    $stmt->bind_param(
        "iiidddddd",
        $session_id,
        $team_id,
        $frequency,
        $waktu_detik,
        $g3t_displacement,
        $g3t_max_disp,
        $g3t_avg_disp,
        $g10t_displacement,
        $g10t_max_disp,
        $g10t_avg_disp
    );
    
    if ($stmt->execute()) {
        $successCount++;
    } else {
        $errorCount++;
    }
}

// Update status session jadi completed
$sql_update = "UPDATE test_sessions SET status = 'completed', finished_at = NOW() WHERE id = ?";
$stmt_update = $conn->prepare($sql_update);
$stmt_update->bind_param("i", $session_id);
$stmt_update->execute();
$stmt_update->close();

$stmt->close();
$conn->close();

if ($successCount > 0) {
    echo json_encode([
        'status' => 'success', 
        'message' => "Berhasil menyimpan $successCount data point",
        'success_count' => $successCount,
        'error_count' => $errorCount,
        'session_id' => $session_id
    ]);
} else {
    echo json_encode([
        'status' => 'error', 
        'message' => 'Gagal menyimpan data',
        'error_count' => $errorCount
    ]);
}
?>
