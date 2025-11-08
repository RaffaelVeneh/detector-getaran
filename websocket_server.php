<?php
/**
 * WebSocket Server untuk Real-time Data Push
 * Port: 8080
 * 
 * Cara jalankan: php websocket_server.php
 */

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
        $this->loop->addPeriodicTimer(0.1, function() { // 100ms
            $this->checkNewData();
        });
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
                    rd.relative_time,
                    rd.session_id,
                    s.status as session_status
                  FROM realtime_data rd
                  INNER JOIN teams t ON rd.laptop_id = t.laptop_id
                  LEFT JOIN sessions s ON rd.session_id = s.id
                  WHERE rd.timestamp > ?
                  ORDER BY rd.timestamp ASC
                  LIMIT 100";
        
        $stmt = $this->conn->prepare($query);
        $stmt->bind_param('s', $lastCheck);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $newData = [];
        while ($row = $result->fetch_assoc()) {
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
        $query = "SELECT 
                    t.laptop_id,
                    t.nama_tim,
                    rd.dista,
                    rd.distb,
                    rd.frequency,
                    rd.timestamp,
                    st.max_dista,
                    st.max_distb,
                    st.avg_dista,
                    st.avg_distb,
                    s.status as session_status
                  FROM teams t
                  LEFT JOIN v_latest_data rd ON t.laptop_id = rd.laptop_id
                  LEFT JOIN sessions s ON s.status = 'running'
                  LEFT JOIN statistics st ON s.id = st.session_id AND t.laptop_id = st.laptop_id
                  ORDER BY t.laptop_id ASC";
        
        $result = $this->conn->query($query);
        $data = [];
        while ($row = $result->fetch_assoc()) {
            $data[] = $row;
        }
        
        $conn->send(json_encode([
            'type' => 'all_teams',
            'data' => $data
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
