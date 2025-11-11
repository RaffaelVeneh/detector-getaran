<?php
/**
 * API: Receive Camera Data
 * POST /api/receive_camera_data.php
 * 
 * Kamera hanya kirim data minimal:
 * {
 *   "laptop_id": 1,
 *   "dista": 110.96,
 *   "distb": 91.64,
 *   "is_a_detected": true,
 *   "is_b_detected": true
 * }
 * 
 * Server akan tambahkan:
 * - category (dari session aktif)
 * - nama_tim (dari database)
 * - frequency (dari session aktif)
 * - session_id (dari session aktif)
 * - relative_time (dihitung dari started_at)
 * - timestamp (waktu server saat terima data)
 */

// Error logging (write to file, not output)
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');
ini_set('error_log', __DIR__ . '/../error_api.log');

header('Content-Type: application/json');

try {
    require_once __DIR__ . '/../db_config.php';
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed', 'message' => $e->getMessage()]);
    exit;
}

// Hanya terima POST request
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed. Use POST.']);
    exit;
}

// Baca JSON dari request body
$json = file_get_contents('php://input');
$data = json_decode($json, true);

// Validasi data minimal dari kamera
if (!isset($data['laptop_id']) || !isset($data['dista']) || !isset($data['distb'])) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Missing required fields',
        'required' => ['laptop_id', 'dista', 'distb'],
        'received' => array_keys($data ?? [])
    ]);
    exit;
}

// Validasi tipe data
$laptop_id = intval($data['laptop_id']);
if ($laptop_id < 1 || $laptop_id > 8) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid laptop_id. Must be 1-8.']);
    exit;
}

// 1. CEK SESSION AKTIF (OPTIONAL - boleh ada atau tidak)
$query_session = "SELECT id, category, frequency, started_at 
                  FROM sessions 
                  WHERE status = 'running' 
                  ORDER BY started_at DESC 
                  LIMIT 1";
$result = $conn->query($query_session);

$session_id = null;
$category = 'baja'; // Default category kalau tidak ada session
$frequency = null;
$relative_time = null;
$session_mode = false;

if ($result->num_rows > 0) {
    // ADA SESSION AKTIF - Mode Recording
    $session = $result->fetch_assoc();
    $session_id = intval($session['id']);
    $category = $session['category'];
    $frequency = floatval($session['frequency']);
    $session_mode = true;
    
    // 2. HITUNG RELATIVE_TIME (detik sejak recording dimulai)
    $query_time = "SELECT TIMESTAMPDIFF(SECOND, started_at, NOW()) as elapsed FROM sessions WHERE id = ?";
    $stmt_time = $conn->prepare($query_time);
    $stmt_time->bind_param('i', $session_id);
    $stmt_time->execute();
    $time_result = $stmt_time->get_result();
    $time_row = $time_result->fetch_assoc();
    $interval = intval($time_row['elapsed']);
    $stmt_time->close();
    
    // Jika sudah lebih dari 60 detik, anggap session selesai (tapi tetap terima data sebagai free mode)
    if ($interval > 60) {
        // Session expired, switch to free mode
        $session_id = null;
        $frequency = null;
        $relative_time = null;
        $session_mode = false;
        error_log("Session {$session['id']} expired (>60s). Accepting data in free mode.");
    } else {
        $relative_time = $interval; // 0-60
    }
} else {
    // TIDAK ADA SESSION - Mode Free (tetap terima data)
    error_log("No active session. Accepting data in free mode with timestamp only.");
}

// 3. GET NAMA_TIM dari database (gunakan category dari session atau default)
$query_team = "SELECT nama_tim FROM teams WHERE laptop_id = ? AND category = ?";
$stmt = $conn->prepare($query_team);
$stmt->bind_param('is', $laptop_id, $category);
$stmt->execute();
$team_result = $stmt->get_result();

if ($team_result->num_rows === 0) {
    // Jika team tidak ditemukan untuk category ini, gunakan nama default
    $nama_tim = "Team $laptop_id";
    error_log("Team not found for laptop_id=$laptop_id, category=$category. Using default name.");
} else {
    $team = $team_result->fetch_assoc();
    $nama_tim = $team['nama_tim'];
}

// 4. PREPARE DATA LENGKAP (data dari kamera + enrichment dari server)
$dista = floatval($data['dista']);
$distb = floatval($data['distb']);
$is_a_detected = isset($data['is_a_detected']) ? boolval($data['is_a_detected']) : false;
$is_b_detected = isset($data['is_b_detected']) ? boolval($data['is_b_detected']) : false;
$now = new DateTime();
$timestamp = $now->format('Y-m-d H:i:s.u');

// 5. INSERT KE DATABASE (tabel realtime_data)
// session_id, frequency, relative_time bisa NULL kalau tidak ada session
$insert_query = "INSERT INTO realtime_data 
                (session_id, laptop_id, dista, distb, is_a_detected, is_b_detected, 
                 frequency, timestamp, relative_time)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

$stmt = $conn->prepare($insert_query);

// Bind parameters - NULL-safe untuk session_id, frequency, relative_time
$stmt->bind_param(
    'iddiiidsi',  // Order: session_id, laptop_id, dista, distb, is_a, is_b, freq, timestamp, rel_time
    $session_id,     // NULL kalau free mode
    $laptop_id,
    $dista,
    $distb,
    $is_a_detected,
    $is_b_detected,
    $frequency,      // NULL kalau free mode
    $timestamp,
    $relative_time   // NULL kalau free mode
);

if (!$stmt->execute()) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Failed to insert data',
        'db_error' => $stmt->error,
        'debug' => [
            'relative_time' => $relative_time,
            'session_id' => $session_id,
            'interval' => $interval
        ]
    ]);
    exit;
}

// 6. BROADCAST KE WEBSOCKET SERVER
// Kirim data ke WebSocket server untuk broadcast ke web clients
$websocket_data = [
    'type' => 'new_data',
    'data' => [[
        'laptop_id' => $laptop_id,
        'nama_tim' => $nama_tim,
        'dista' => $dista,
        'distb' => $distb,
        'is_a_detected' => $is_a_detected,
        'is_b_detected' => $is_b_detected,
        'frequency' => $frequency,
        'session_id' => $session_id,
        'relative_time' => $relative_time,
        'timestamp' => $timestamp,
        'category' => $category
    ]],
    'count' => 1,
    'timestamp' => date('Y-m-d H:i:s.u')
];

// Kirim via cURL (lebih reliable untuk Windows)
$ch = curl_init('http://localhost/detector-getaran/api/internal_broadcast.php');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($websocket_data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT_MS, 100); // 100ms timeout
$result = curl_exec($ch);
$curl_errno = curl_errno($ch);
$curl_error = curl_error($ch);
curl_close($ch);

// Log hasil cURL untuk debugging
if ($curl_errno) {
    error_log("CURL ERROR: Code $curl_errno - $curl_error");
} else {
    error_log("CURL SUCCESS: $result");
}

// 7. RESPONSE SUKSES KE KAMERA
// Kamera mendapat konfirmasi bahwa data diterima + info tambahan
http_response_code(200);
echo json_encode([
    'success' => true,
    'message' => 'Data received and stored',
    'mode' => $session_mode ? 'recording' : 'free',  // Informasi mode
    'data' => [
        // Data original dari kamera
        'laptop_id' => $laptop_id,
        'dista' => $dista,
        'distb' => $distb,
        'is_a_detected' => $is_a_detected,
        'is_b_detected' => $is_b_detected,
        
        // Data yang ditambahkan server
        'category' => $category,
        'nama_tim' => $nama_tim,
        'frequency' => $frequency,       // NULL di free mode
        'session_id' => $session_id,     // NULL di free mode
        'relative_time' => $relative_time, // NULL di free mode
        'timestamp' => $timestamp
    ]
]);

$stmt->close();
$conn->close();
