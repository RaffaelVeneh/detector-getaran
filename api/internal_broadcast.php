<?php
/**
 * Internal Broadcast Endpoint
 * Dipanggil oleh API untuk broadcast data ke WebSocket clients
 * TIDAK boleh diakses dari luar!
 */

// HANYA terima request dari localhost
if ($_SERVER['REMOTE_ADDR'] !== '127.0.0.1' && $_SERVER['REMOTE_ADDR'] !== '::1') {
    http_response_code(403);
    die('Forbidden');
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    die('Method not allowed');
}

// Ambil data dari POST body
$json = file_get_contents('php://input');
$data = json_decode($json, true);

if (!$data) {
    http_response_code(400);
    die('Invalid JSON');
}

// Simpan ke shared memory file (WebSocket akan baca ini)
$broadcast_file = __DIR__ . '/../temp/broadcast_queue.jsonl';
$dir = dirname($broadcast_file);
if (!is_dir($dir)) {
    mkdir($dir, 0777, true);
}

// Append data dengan lock
$fp = fopen($broadcast_file, 'a');
if (flock($fp, LOCK_EX)) {
    fwrite($fp, $json . "\n");
    fflush($fp);
    flock($fp, LOCK_UN);
}
fclose($fp);

http_response_code(200);
echo json_encode(['success' => true, 'queued' => true]);
?>
