<?php
require_once 'db_config.php';

// Stop ALL running sessions
$result = $conn->query("UPDATE sessions SET status='stopped', stopped_at=NOW() WHERE status='running'");

if ($result) {
    $affected = $conn->affected_rows;
    echo "✅ Stopped $affected running session(s)\n";
    
    // Show all sessions
    echo "\n📋 All Sessions:\n";
    $sessions = $conn->query("SELECT id, category, frequency, status, started_at FROM sessions ORDER BY id DESC LIMIT 5");
    while ($row = $sessions->fetch_assoc()) {
        echo "  - Session #{$row['id']}: {$row['category']} @ {$row['frequency']}Hz - Status: {$row['status']}\n";
    }
} else {
    echo "❌ Error: " . $conn->error . "\n";
}

$conn->close();
?>
