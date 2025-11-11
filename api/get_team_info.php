<?php
/**
 * API: Get Team Info
 * Returns team name based on laptop_id and category
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once '../db_config.php';

// Get parameters
$laptop_id = intval($_GET['laptop_id'] ?? 0);
$category = $_GET['category'] ?? 'baja';

// Validate laptop_id
if ($laptop_id < 1 || $laptop_id > 8) {
    echo json_encode(['error' => 'Invalid laptop_id. Must be between 1-8.']);
    exit;
}

// Validate category
if (!in_array($category, ['baja', 'beton'])) {
    echo json_encode(['error' => 'Invalid category. Must be "baja" or "beton".']);
    exit;
}

try {
    // Query team info
    $query = "SELECT laptop_id, category, nama_tim FROM teams WHERE laptop_id = ? AND category = ?";
    $stmt = $conn->prepare($query);
    $stmt->bind_param('is', $laptop_id, $category);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        echo json_encode([
            'laptop_id' => (int)$row['laptop_id'],
            'category' => $row['category'],
            'nama_tim' => $row['nama_tim']
        ]);
    } else {
        echo json_encode(['error' => 'Team not found']);
    }
    
    $stmt->close();
} catch (Exception $e) {
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
}

$conn->close();
?>
