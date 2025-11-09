<?php
// API untuk mengelola tim dan data pengujian
include 'db_config.php';

header('Content-Type: application/json');

// Cek metode request
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    handleGet($conn);
} elseif ($method === 'POST') {
    handlePost($conn);
}

$conn->close();

// ===== HANDLE GET REQUEST =====
function handleGet($conn) {
    $action = $_GET['action'] ?? '';
    
    if ($action === 'get_all') {
        // Ambil semua tim
        $sql = "SELECT id, nama_tim, created_at FROM teams ORDER BY created_at DESC";
        $result = $conn->query($sql);
        
        $teams = [];
        if ($result->num_rows > 0) {
            while($row = $result->fetch_assoc()) {
                $teams[] = $row;
            }
        }
        
        echo json_encode($teams);
        
    } elseif ($action === 'get_test_data') {
        // Ambil data pengujian tim tertentu (untuk export CSV)
        $team_id = $_GET['team_id'] ?? 0;
        
        $sql = "SELECT 
                    d.timestamp,
                    d.waktu_detik,
                    d.g3t_displacement,
                    d.g3t_max_disp,
                    d.g3t_avg_disp,
                    d.g10t_displacement,
                    d.g10t_max_disp,
                    d.g10t_avg_disp,
                    d.frekuensi_ke
                FROM test_data d
                WHERE d.team_id = ? 
                ORDER BY d.frekuensi_ke ASC, d.waktu_detik ASC";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $team_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $data = [];
        if ($result->num_rows > 0) {
            while($row = $result->fetch_assoc()) {
                $data[] = $row;
            }
        }
        
        echo json_encode($data);
        $stmt->close();
        
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
    }
}

// ===== HANDLE POST REQUEST =====
function handlePost($conn) {
    $action = $_POST['action'] ?? '';
    
    if ($action === 'add') {
        // Tambah tim baru
        $nama_tim = $_POST['nama_tim'] ?? '';
        
        if (empty($nama_tim)) {
            echo json_encode(['status' => 'error', 'message' => 'Nama tim harus diisi']);
            return;
        }
        
        $sql = "INSERT INTO teams (nama_tim) VALUES (?)";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("s", $nama_tim);
        
        if ($stmt->execute()) {
            echo json_encode(['status' => 'success', 'message' => 'Tim berhasil ditambahkan', 'id' => $stmt->insert_id]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Gagal menambahkan tim: ' . $stmt->error]);
        }
        
        $stmt->close();
        
    } elseif ($action === 'update') {
        // Update tim
        $id = $_POST['id'] ?? 0;
        $nama_tim = $_POST['nama_tim'] ?? '';
        
        if (empty($nama_tim) || $id <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'Data tidak valid']);
            return;
        }
        
        $sql = "UPDATE teams SET nama_tim = ? WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("si", $nama_tim, $id);
        
        if ($stmt->execute()) {
            echo json_encode(['status' => 'success', 'message' => 'Tim berhasil diperbarui']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Gagal memperbarui tim: ' . $stmt->error]);
        }
        
        $stmt->close();
        
    } elseif ($action === 'delete') {
        // Hapus tim
        $id = $_POST['id'] ?? 0;
        
        if ($id <= 0) {
            echo json_encode(['status' => 'error', 'message' => 'ID tidak valid']);
            return;
        }
        
        // Hapus data pengujian terkait terlebih dahulu
        $sql = "DELETE FROM test_data WHERE team_id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $stmt->close();
        
        // Hapus tim
        $sql = "DELETE FROM teams WHERE id = ?";
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("i", $id);
        
        if ($stmt->execute()) {
            echo json_encode(['status' => 'success', 'message' => 'Tim berhasil dihapus']);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Gagal menghapus tim: ' . $stmt->error]);
        }
        
        $stmt->close();
        
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
    }
}
?>
