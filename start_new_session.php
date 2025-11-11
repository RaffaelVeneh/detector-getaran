<?php
require_once 'db_config.php';

// 1. Stop all running sessions
$conn->query("UPDATE sessions SET status='stopped', stopped_at=NOW() WHERE status='running'");
echo "Old sessions stopped\n";

// 2. Start new session
$category = 'baja';
$frequency = 1.5;
$result = $conn->query("INSERT INTO sessions (category, frequency, started_at, status) VALUES ('$category', $frequency, NOW(), 'running')");

if ($result) {
    $new_session_id = $conn->insert_id;
    echo "New session started: ID=$new_session_id, Category=$category, Frequency=$frequency Hz\n";
    
    // Get session details
    $result = $conn->query("SELECT * FROM sessions WHERE id=$new_session_id");
    $session = $result->fetch_assoc();
    echo "Started at: {$session['started_at']}\n";
} else {
    echo "Failed to start session: " . $conn->error . "\n";
}

$conn->close();
?>
