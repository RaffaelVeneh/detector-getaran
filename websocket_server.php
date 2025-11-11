<?php
/**
 * WebSocket Server untuk Real-time Data Push
 * Port: 8080
 * 
 * Cara jalankan: php websocket_server.php
 */

// Suppress PHP 8.2+ deprecation warnings untuk dynamic properties di Ratchet
error_reporting(E_ALL & ~E_DEPRECATED);

require __DIR__ . '/vendor/autoload.php';
require __DIR__ . '/db_config.php';

use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;
use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;

class DetectorGetaranWebSocket implements MessageComponentInterface {
    protected $clients;
    protected $conn; // MySQL connection
    protected $loop; // Event loop
    
    public function __construct($db_connection, $loop) {
        $this->clients = new \SplObjectStorage;
        $this->conn = $db_connection;
        $this->loop = $loop;
        
        echo "WebSocket Server initialized\n";
        
        // Start polling MySQL untuk data baru setiap 100ms
        $this->startPolling();
    }
    
    public function onOpen(ConnectionInterface $conn) {
        $this->clients->attach($conn);
        echo "New connection! ({$conn->resourceId})\n";
        
        // Kirim data terbaru saat client connect
        $this->sendLatestData($conn);
    }
    
    public function onMessage(ConnectionInterface $from, $msg) {
        $data = json_decode($msg, true);
        
        // Handle new_data dari simulator - langsung broadcast!
        if (isset($data['type']) && $data['type'] === 'new_data') {
            echo "Received new_data from simulator with " . count($data['data']) . " teams\n";
            
            // Broadcast langsung ke semua client
            foreach ($this->clients as $client) {
                $client->send($msg); // Forward as-is
            }
            
            echo "Broadcasted new_data to " . count($this->clients) . " clients\n";
            return;
        }
        
        // Handle session_started dari simulator
        if (isset($data['type']) && $data['type'] === 'session_started') {
            echo "Received session_started: Category={$data['category']}, Freq={$data['frequency']} Hz\n";
            
            // Broadcast ke semua client
            foreach ($this->clients as $client) {
                $client->send($msg);
            }
            
            echo "Broadcasted session_started to " . count($this->clients) . " clients\n";
            return;
        }
        
        // Handle session_stopped dari simulator
        if (isset($data['type']) && $data['type'] === 'session_stopped') {
            echo "Received session_stopped\n";
            
            // Broadcast ke semua client
            foreach ($this->clients as $client) {
                $client->send($msg);
            }
            
            echo "Broadcasted session_stopped to " . count($this->clients) . " clients\n";
            return;
        }
        
        // Handle broadcast dari admin (relay ke semua client)
        if (isset($data['type']) && $data['type'] === 'broadcast' && isset($data['message'])) {
            $message = json_encode($data['message']);
            
            // Broadcast ke semua client KECUALI pengirim
            foreach ($this->clients as $client) {
                if ($client !== $from) {
                    $client->send($message);
                }
            }
            
            $messageType = $data['message']['type'] ?? 'unknown';
            echo "[" . date('H:i:s') . "] ✅ Broadcasted '$messageType' from admin to " . (count($this->clients) - 1) . " clients\n";
            return;
        }
        
        // Handle category_change broadcast dari admin (legacy)
        if (isset($data['type']) && $data['type'] === 'category_change') {
            $message = json_encode([
                'type' => 'category_change',
                'category' => $data['category'],
                'timestamp' => date('Y-m-d H:i:s')
            ]);
            
            foreach ($this->clients as $client) {
                $client->send($message);
            }
            
            echo "Broadcasted category_change: {$data['category']}\n";
            return;
        }
        
        // Handle camera_data dari OpenCV (5 fields dari kamera)
        if (isset($data['type']) && $data['type'] === 'camera_data') {
            echo "Received camera_data from laptop_id: {$data['laptop_id']}\n";
            
            // PROSES DATA: Tambahkan 6 fields lain dari server
            $enriched_data = $this->enrichCameraData($data);
            
            if ($enriched_data) {
                // Broadcast ke semua client (admin + user pages)
                $message = json_encode($enriched_data);
                foreach ($this->clients as $client) {
                    $client->send($message);
                }
                
                echo "Broadcasted enriched data to " . count($this->clients) . " clients\n";
            }
            
            return;
        }
        
        // Handle request dari client
        if (isset($data['action'])) {
            switch ($data['action']) {
                case 'get_all':
                    $this->sendAllTeamsData($from);
                    break;
                    
                case 'get_team':
                    if (isset($data['laptop_id'])) {
                        $this->sendTeamData($from, $data['laptop_id']);
                    }
                    break;
                    
                case 'ping':
                    $from->send(json_encode(['type' => 'pong', 'timestamp' => time()]));
                    break;
            }
        }
    }
    
    public function onClose(ConnectionInterface $conn) {
        $this->clients->detach($conn);
        echo "Connection {$conn->resourceId} has disconnected\n";
    }
    
    public function onError(ConnectionInterface $conn, \Exception $e) {
        echo "Error: {$e->getMessage()}\n";
        $conn->close();
    }
    
    /**
     * Polling MySQL setiap 100ms untuk data baru
     */
    private function startPolling() {
        // Poll broadcast queue file setiap 100ms
        $this->loop->addPeriodicTimer(0.1, function() {
            $this->checkBroadcastQueue();
        });
        
        // Session changes sekarang di-broadcast langsung dari admin via WebSocket
        // Tidak perlu polling database lagi
    }
    
    /**
     * Enrich camera data dengan 6 fields tambahan dari server
     * 
     * Input dari kamera (5 fields):
     * - laptop_id, dista, distb, is_a_detected, is_b_detected
     * 
     * Output ke client (11 fields total):
     * - 5 fields dari kamera + 6 fields dari server
     */
    private function enrichCameraData($camera_data) {
        $laptop_id = $camera_data['laptop_id'] ?? null;
        
        if (!$laptop_id) {
            echo "Error: laptop_id tidak ada\n";
            return null;
        }
        
        // Ambil session info dari database
        $stmt = $this->conn->prepare("
            SELECT id, category, frequency, 
                   TIMESTAMPDIFF(SECOND, started_at, NOW()) as elapsed_seconds
            FROM sessions 
            WHERE status = 'running' 
            LIMIT 1
        ");
        $stmt->execute();
        $session = $stmt->get_result()->fetch_assoc();
        
        if (!$session) {
            echo "Warning: Tidak ada session aktif\n";
            return null;
        }
        
        $session_id = $session['id'];
        $category = $session['category'];
        $frequency = $session['frequency'];
        $elapsed_seconds = max(0, min(60, (int)$session['elapsed_seconds'])); // 0-60
        
        // Hitung relative_time (waktu dalam sesi)
        $relative_time = $elapsed_seconds;
        
        // Insert ke database
        $stmt = $this->conn->prepare("
            INSERT INTO measurements 
            (session_id, laptop_id, relative_time, dista, distb, is_a_detected, is_b_detected) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->bind_param(
            'iiiddii',
            $session_id,
            $laptop_id,
            $relative_time,
            $camera_data['dista'],
            $camera_data['distb'],
            $camera_data['is_a_detected'],
            $camera_data['is_b_detected']
        );
        
        if (!$stmt->execute()) {
            echo "Error: Gagal insert data ke database\n";
            return null;
        }
        
        echo "✓ Data saved to DB (session_id: $session_id, laptop_id: $laptop_id)\n";
        
        // Return enriched data dalam format yang compatible dengan admin & user pages
        // Format: {type: 'new_data', data: [array of objects]}
        return [
            'type' => 'new_data',
            'data' => [
                [
                    // 5 fields dari kamera:
                    'laptop_id' => (int)$laptop_id,
                    'dista' => (float)$camera_data['dista'],
                    'distb' => (float)$camera_data['distb'],
                    'is_a_detected' => (bool)$camera_data['is_a_detected'],
                    'is_b_detected' => (bool)$camera_data['is_b_detected'],
                    // 6 fields tambahan dari server:
                    'session_id' => $session_id,
                    'category' => $category,
                    'frequency' => (float)$frequency,
                    'relative_time' => $relative_time,
                    'elapsed_seconds' => $elapsed_seconds,
                    'timestamp' => date('Y-m-d H:i:s')
                ]
            ]
        ];
    }
    
    /**
     * Baca broadcast queue dan kirim ke semua client
     */
    private function checkBroadcastQueue() {
        $queue_file = __DIR__ . '/temp/broadcast_queue.jsonl';
        
        if (!file_exists($queue_file)) {
            return;
        }
        
        // Baca dan clear file dengan atomic operation
        $fp = fopen($queue_file, 'r+');
        if (!flock($fp, LOCK_EX)) {
            fclose($fp);
            return;
        }
        
        // Baca semua lines
        $lines = [];
        while (!feof($fp)) {
            $line = fgets($fp);
            if ($line && trim($line) !== '') {
                $lines[] = trim($line);
            }
        }
        
        // Clear file
        ftruncate($fp, 0);
        rewind($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
        
        // Broadcast semua data
        foreach ($lines as $line) {
            $data = json_decode($line, true);
            if ($data && count($this->clients) > 0) {
                $message = json_encode($data);
                foreach ($this->clients as $client) {
                    $client->send($message);
                }
                echo "Broadcasted to " . count($this->clients) . " clients\n";
            }
        }
    }
    
    /**
     * Cek data baru dari database dan broadcast ke semua client
     */
    private function checkNewData() {
        static $lastCheck = null;
        
        if ($lastCheck === null) {
            $lastCheck = date('Y-m-d H:i:s', strtotime('-1 second'));
        }
        
        $query = "SELECT 
                    rd.id,
                    rd.laptop_id,
                    t.nama_tim,
                    rd.dista,
                    rd.distb,
                    rd.is_a_detected,
                    rd.is_b_detected,
                    rd.frequency,
                    rd.timestamp,
                    COALESCE(
                        rd.relative_time,
                        TIMESTAMPDIFF(MICROSECOND, s.started_at, rd.timestamp) / 1000000
                    ) as relative_time,
                    rd.session_id,
                    s.status as session_status,
                    s.frequency as session_frequency,
                    s.category as category
                  FROM realtime_data rd
                  LEFT JOIN sessions s ON rd.session_id = s.id
                  INNER JOIN teams t ON rd.laptop_id = t.laptop_id AND (s.category IS NULL OR t.category = s.category)
                  WHERE rd.timestamp > ?
                  ORDER BY rd.timestamp ASC
                  LIMIT 100";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param('s', $lastCheck);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $newData = [];
        while ($row = $result->fetch_assoc()) {
            // Pastikan relative_time tidak null/kosong
            if ($row['relative_time'] === null || $row['relative_time'] === '') {
                $row['relative_time'] = 0;
            }
            $newData[] = $row;
            $lastCheck = $row['timestamp'];
        }
        
        if (!empty($newData)) {
            // Broadcast ke semua client yang terkoneksi
            $message = json_encode([
                'type' => 'new_data',
                'data' => $newData,
                'count' => count($newData),
                'timestamp' => date('Y-m-d H:i:s.u')
            ]);
            
            foreach ($this->clients as $client) {
                $client->send($message);
            }
            
            echo "Broadcasted " . count($newData) . " new records\n";
        }
        
        // Check for session changes and broadcast
        $this->checkSessionChanges();
    }
    
    /**
     * Kirim data terbaru saat client connect
     */
    private function sendLatestData(ConnectionInterface $conn) {
        $query = "SELECT * FROM v_latest_data ORDER BY laptop_id ASC";
        $result = $this->conn->query($query);
        
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        
        $conn->send(json_encode([
            'type' => 'initial_data',
            'data' => $data
        ]));
    }
    
    /**
     * Kirim data semua tim
     */
    private function sendAllTeamsData(ConnectionInterface $conn) {
        // Get all teams
        $teams_query = "SELECT laptop_id, nama_tim, category FROM teams ORDER BY laptop_id ASC";
        $teams_result = $this->conn->query($teams_query);
        
        $teams_data = [];
        
        while ($team = $teams_result->fetch_assoc()) {
            $laptop_id = $team['laptop_id'];
            $category = $team['category'];
            
            // Get realtime data grouped by frequency
            $data_query = "SELECT dista, distb, frequency, relative_time, timestamp
                          FROM realtime_data
                          WHERE laptop_id = ?
                          ORDER BY timestamp DESC
                          LIMIT 6000";
            
            $stmt = $this->conn->prepare($data_query);
            $stmt->bind_param('i', $laptop_id);
            $stmt->execute();
            $data_result = $stmt->get_result();
            
            $data_by_freq = [
                '1.5' => [],
                '2.5' => [],
                '3.5' => [],
                '4.5' => [],
                '5.5' => []
            ];
            
            while ($row = $data_result->fetch_assoc()) {
                $freq = number_format((float)$row['frequency'], 1);
                if (isset($data_by_freq[$freq])) {
                    $data_by_freq[$freq][] = [
                        'dista' => (float)$row['dista'],
                        'distb' => (float)$row['distb'],
                        'relative_time' => (float)($row['relative_time'] ?? 0)
                    ];
                }
            }
            
            // Get statistics grouped by frequency
            $stats_query = "SELECT s.frequency, st.max_dista, st.max_distb, st.avg_dista, st.avg_distb
                           FROM sessions s
                           LEFT JOIN statistics st ON s.id = st.session_id AND st.laptop_id = ?
                           ORDER BY s.id ASC";
            
            $stmt = $this->conn->prepare($stats_query);
            $stmt->bind_param('i', $laptop_id);
            $stmt->execute();
            $stats_result = $stmt->get_result();
            
            $stats_by_freq = [];
            while ($row = $stats_result->fetch_assoc()) {
                $freq = number_format((float)$row['frequency'], 1);
                $stats_by_freq[$freq] = [
                    'max_dista' => (float)($row['max_dista'] ?? 0),
                    'max_distb' => (float)($row['max_distb'] ?? 0),
                    'avg_dista' => (float)($row['avg_dista'] ?? 0),
                    'avg_distb' => (float)($row['avg_distb'] ?? 0)
                ];
            }
            
            $teams_data[] = [
                'laptop_id' => (int)$laptop_id,
                'nama_tim' => $team['nama_tim'],
                'category' => $category,
                'data' => $data_by_freq,
                'statistics' => $stats_by_freq
            ];
        }
        
        $conn->send(json_encode([
            'type' => 'all_teams',
            'teams' => $teams_data
        ]));
    }
    
    /**
     * Kirim data 1 tim spesifik
     */
    private function sendTeamData(ConnectionInterface $conn, $laptop_id) {
        $query = "SELECT 
                    rd.*,
                    t.nama_tim,
                    s.frequency as session_frequency,
                    s.status as session_status
                  FROM realtime_data rd
                  INNER JOIN teams t ON rd.laptop_id = t.laptop_id
                  LEFT JOIN sessions s ON rd.session_id = s.id
                  WHERE rd.laptop_id = ?
                  ORDER BY rd.timestamp DESC
                  LIMIT 1000";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param('i', $laptop_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        
        $conn->send(json_encode([
            'type' => 'team_data',
            'laptop_id' => $laptop_id,
            'data' => $data
        ]));
    }
    
    /**
     * Check for session status changes and broadcast to all clients
     */
    private function checkSessionChanges() {
        static $lastSessionState = null;
        static $pollCount = 0;
        
        $pollCount++;
        // Log setiap 10 poll (setiap 5 detik)
        if ($pollCount % 10 == 0) {
            echo "[" . date('H:i:s') . "] Polling session status... (poll #$pollCount)\n";
        }
        
        // Get current active session
        $query = "SELECT id, frequency, category, status, started_at, stopped_at,
                  TIMESTAMPDIFF(SECOND, started_at, NOW()) as elapsed_seconds
                  FROM sessions 
                  WHERE status = 'running' 
                  ORDER BY started_at DESC 
                  LIMIT 1";
        
        $result = $this->conn->query($query);
        $currentSession = $result->fetch_assoc();
        
        $currentState = $currentSession ? $currentSession['id'] . '_' . $currentSession['status'] : null;
        
        // Detect state change
        if ($currentState !== $lastSessionState) {
            echo "[" . date('H:i:s') . "] Session state changed: $lastSessionState -> $currentState\n";
            
            if ($currentSession && $currentSession['status'] === 'running') {
                // Session started
                $message = json_encode([
                    'type' => 'session_started',
                    'session_id' => $currentSession['id'],
                    'frequency' => $currentSession['frequency'],
                    'category' => $currentSession['category'],
                    'started_at' => $currentSession['started_at'],
                    'elapsed_seconds' => $currentSession['elapsed_seconds'],
                    'timestamp' => date('Y-m-d H:i:s')
                ]);
                
                echo "Broadcasting to " . count($this->clients) . " clients...\n";
                foreach ($this->clients as $client) {
                    $client->send($message);
                }
                
                echo "✅ Broadcasted session_started: Session {$currentSession['id']}, Freq {$currentSession['frequency']} Hz, Category {$currentSession['category']}\n";
            } elseif ($lastSessionState !== null && $currentSession === null) {
                // Session stopped
                $message = json_encode([
                    'type' => 'session_stopped',
                    'timestamp' => date('Y-m-d H:i:s')
                ]);
                
                foreach ($this->clients as $client) {
                    $client->send($message);
                }
                
                echo "Broadcasted session_stopped\n";
            }
            
            $lastSessionState = $currentState;
        }
    }
}

// Create event loop
$loop = \React\EventLoop\Factory::create();

// Start WebSocket Server with loop
$webSocket = new DetectorGetaranWebSocket($conn, $loop);

$server = new IoServer(
    new HttpServer(
        new WsServer($webSocket)
    ),
    new \React\Socket\Server('0.0.0.0:8080', $loop),
    $loop
);

echo "\n===========================================\n";
echo "  Detector Getaran WebSocket Server\n";
echo "===========================================\n";
echo "  Listening on: ws://localhost:8080\n";
echo "  Press Ctrl+C to stop\n";
echo "===========================================\n\n";

$loop->run();
