<?php
/**
 * Migration Script: Update Team Order
 * Updates the laptop_id assignments for all teams based on new order
 */

require_once 'db_config.php';

echo "=== Migration: Update Team Order ===\n\n";

try {
    $conn->begin_transaction();
    
    echo "Current team assignments:\n";
    $result = $conn->query("SELECT laptop_id, category, nama_tim FROM teams ORDER BY category, laptop_id");
    while ($row = $result->fetch_assoc()) {
        echo "  Laptop {$row['laptop_id']} ({$row['category']}): {$row['nama_tim']}\n";
    }
    echo "\n";
    
    echo "Step 1: Moving BAJA teams to temporary IDs (100+)...\n";
    
    // BAJA Category Updates - First move to temp IDs
    $updates = [
        ["pattern" => "%Udayana%", "id" => 1, "temp_id" => 101, "name" => "Universitas Udayana"],
        ["pattern" => "%Semarang%", "id" => 2, "temp_id" => 102, "name" => "Politeknik Negeri Semarang"],
        ["pattern" => "%Jember%", "id" => 3, "temp_id" => 103, "name" => "Universitas Jember"],
        ["pattern" => "%Astra%", "id" => 4, "temp_id" => 104, "name" => "Politeknik Astra"],
        ["pattern" => "%Sepuluh Nopember%", "id" => 5, "temp_id" => 105, "name" => "Institut Teknologi Sepuluh Nopember"],
        ["pattern" => "%Nasional Malang%", "id" => 6, "temp_id" => 106, "name" => "Institut Teknologi Nasional Malang"],
        ["pattern" => "%Brawijaya%", "id" => 7, "temp_id" => 107, "name" => "Universitas Brawijaya"],
        ["pattern" => "%Negeri Malang%", "id" => 8, "temp_id" => 108, "name" => "Universitas Negeri Malang"]
    ];
    
    foreach ($updates as $update) {
        $stmt = $conn->prepare("UPDATE teams SET laptop_id = ? WHERE category = 'baja' AND nama_tim LIKE ?");
        $stmt->bind_param('is', $update['temp_id'], $update['pattern']);
        $stmt->execute();
        $affected = $stmt->affected_rows;
        echo "  ✓ Temp {$update['temp_id']}: {$update['name']} ({$affected} rows)\n";
        $stmt->close();
    }
    
    echo "\nStep 2: Moving BETON teams to temporary IDs (200+)...\n";
    
    // BETON Category Updates - First move to temp IDs
    $updates_beton = [
        ["pattern" => "%Bandung%", "id" => 1, "temp_id" => 201, "name" => "Politeknik Bandung"],
        ["pattern" => "%Warmadewa%", "id" => 2, "temp_id" => 202, "name" => "Universitas Warmadewa"],
        ["pattern" => "%Sepuluh Nopember%", "id" => 3, "temp_id" => 203, "name" => "Institut Teknologi Sepuluh Nopember"],
        ["pattern" => "%Muhammadiyah%", "id" => 4, "temp_id" => 204, "name" => "Universitas Muhammadiyah Malang"],
        ["pattern" => "%Brawijaya%", "id" => 5, "temp_id" => 205, "name" => "Universitas Brawijaya"],
        ["pattern" => "%Yogyakarta%", "id" => 6, "temp_id" => 206, "name" => "Universitas Negeri Yogyakarta"],
        ["pattern" => "%Politeknik Negeri Malang%", "id" => 7, "temp_id" => 207, "name" => "Politeknik Negeri Malang"],
        ["pattern" => "%Jakarta%", "id" => 8, "temp_id" => 208, "name" => "Universitas Negeri Jakarta"]
    ];
    
    foreach ($updates_beton as $update) {
        $stmt = $conn->prepare("UPDATE teams SET laptop_id = ? WHERE category = 'beton' AND nama_tim LIKE ?");
        $stmt->bind_param('is', $update['temp_id'], $update['pattern']);
        $stmt->execute();
        $affected = $stmt->affected_rows;
        echo "  ✓ Temp {$update['temp_id']}: {$update['name']} ({$affected} rows)\n";
        $stmt->close();
    }
    
    echo "\nStep 3: Moving BAJA teams to final positions...\n";
    
    // Now move BAJA teams to their final positions
    foreach ($updates as $update) {
        $stmt = $conn->prepare("UPDATE teams SET laptop_id = ? WHERE category = 'baja' AND laptop_id = ?");
        $stmt->bind_param('ii', $update['id'], $update['temp_id']);
        $stmt->execute();
        $affected = $stmt->affected_rows;
        echo "  ✓ Laptop {$update['id']}: {$update['name']} ({$affected} rows)\n";
        $stmt->close();
    }
    
    echo "\nStep 4: Moving BETON teams to final positions...\n";
    
    // Now move BETON teams to their final positions
    foreach ($updates_beton as $update) {
        $stmt = $conn->prepare("UPDATE teams SET laptop_id = ? WHERE category = 'beton' AND laptop_id = ?");
        $stmt->bind_param('ii', $update['id'], $update['temp_id']);
        $stmt->execute();
        $affected = $stmt->affected_rows;
        echo "  ✓ Laptop {$update['id']}: {$update['name']} ({$affected} rows)\n";
        $stmt->close();
    }
    
    $conn->commit();
    
    echo "\n✓ Migration completed successfully!\n\n";
    
    echo "Updated team assignments:\n";
    $result = $conn->query("SELECT laptop_id, category, nama_tim FROM teams ORDER BY category, laptop_id");
    while ($row = $result->fetch_assoc()) {
        echo "  Laptop {$row['laptop_id']} ({$row['category']}): {$row['nama_tim']}\n";
    }
    
} catch (Exception $e) {
    $conn->rollback();
    echo "✗ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}

$conn->close();
echo "\n=== Migration Complete ===\n";
?>
