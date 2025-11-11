<?php
/**
 * Script untuk menjalankan migration category system
 * Jalankan: php run_migration_category.php
 */

require_once 'db_config.php';

echo "========================================\n";
echo "Running Category System Migration\n";
echo "========================================\n\n";

// Read migration file
$migration_file = 'migration_add_category_system.sql';
if (!file_exists($migration_file)) {
    die("Error: Migration file not found: $migration_file\n");
}

$sql = file_get_contents($migration_file);

// Split by semicolon and execute each statement
$statements = array_filter(array_map('trim', explode(';', $sql)));

$success_count = 0;
$error_count = 0;

foreach ($statements as $statement) {
    // Skip empty statements and comments
    if (empty($statement) || strpos($statement, '--') === 0 || strpos($statement, '/*') === 0) {
        continue;
    }
    
    // Skip USE database statement (already connected)
    if (stripos($statement, 'USE ') === 0) {
        continue;
    }
    
    // Execute statement
    if ($conn->multi_query($statement)) {
        do {
            if ($result = $conn->store_result()) {
                // Display results for SELECT statements
                if ($result->num_rows > 0) {
                    echo "\nQuery Results:\n";
                    while ($row = $result->fetch_assoc()) {
                        echo "  " . implode(' | ', $row) . "\n";
                    }
                }
                $result->free();
            }
        } while ($conn->more_results() && $conn->next_result());
        
        if ($conn->errno) {
            echo "❌ Error: " . $conn->error . "\n";
            echo "   Statement: " . substr($statement, 0, 100) . "...\n\n";
            $error_count++;
        } else {
            $success_count++;
        }
    } else {
        echo "❌ Error executing: " . $conn->error . "\n";
        echo "   Statement: " . substr($statement, 0, 100) . "...\n\n";
        $error_count++;
    }
}

// Verify teams data
echo "\n========================================\n";
echo "Verifying Teams Data:\n";
echo "========================================\n";

$result = $conn->query("SELECT category, COUNT(*) as count FROM teams GROUP BY category");
while ($row = $result->fetch_assoc()) {
    echo "Category '{$row['category']}': {$row['count']} teams\n";
}

$result = $conn->query("SELECT COUNT(*) as total FROM teams");
$row = $result->fetch_assoc();
echo "\nTotal teams: {$row['total']}\n";

echo "\n========================================\n";
echo "Migration Summary:\n";
echo "========================================\n";
echo "✅ Successful statements: $success_count\n";
if ($error_count > 0) {
    echo "❌ Failed statements: $error_count\n";
}
echo "\n✅ Migration Complete!\n";
echo "========================================\n";

$conn->close();
