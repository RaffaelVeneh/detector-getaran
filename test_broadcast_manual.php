<?php
/**
 * Manual Broadcast Test
 * Kirim test data langsung ke broadcast queue
 */

$queue_file = __DIR__ . '/temp/broadcast_queue.jsonl';
$dir = dirname($queue_file);
if (!is_dir($dir)) {
    mkdir($dir, 0777, true);
}

$test_data = [
    'type' => 'new_data',
    'data' => [
        [
            'laptop_id' => 4,
            'nama_tim' => 'Test Tim 4',
            'dista' => 15.5,
            'distb' => 12.3,
            'is_a_detected' => true,
            'is_b_detected' => true,
            'frequency' => null,
            'session_id' => null,
            'relative_time' => 0,
            'timestamp' => date('Y-m-d H:i:s'),
            'category' => 'baja'
        ]
    ],
    'count' => 1,
    'timestamp' => date('Y-m-d H:i:s')
];

// Write to queue
$fp = fopen($queue_file, 'a');
if (flock($fp, LOCK_EX)) {
    fwrite($fp, json_encode($test_data) . "\n");
    fflush($fp);
    flock($fp, LOCK_UN);
    echo "✅ Test data written to queue\n";
    echo json_encode($test_data, JSON_PRETTY_PRINT) . "\n";
} else {
    echo "❌ Failed to write to queue\n";
}
fclose($fp);
?>
