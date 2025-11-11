<?php
/**
 * QUICK MIGRATION SCRIPT - Tambah Category System
 * Jalankan dari browser: http://localhost/detector-getaran/migrate_category.php
 */

require_once 'db_config.php';

echo "<pre>";
echo "========================================\n";
echo "MIGRATION: Category System (Baja/Beton)\n";
echo "========================================\n\n";

// Step 1: Add category column to teams
echo "1. Adding 'category' column to 'teams' table...\n";
$conn->query("ALTER TABLE teams ADD COLUMN IF NOT EXISTS category ENUM('baja', 'beton') DEFAULT 'baja' AFTER laptop_id");
echo "   ✅ Done\n\n";

// Step 2: Add category column to sessions
echo "2. Adding 'category' column to 'sessions' table...\n";
$conn->query("ALTER TABLE sessions ADD COLUMN IF NOT EXISTS category ENUM('baja', 'beton') DEFAULT 'baja' AFTER frequency");
echo "   ✅ Done\n\n";

// Step 3: Clear teams table
echo "3. Clearing existing teams data...\n";
$conn->query("TRUNCATE TABLE teams");
echo "   ✅ Done\n\n";

// Step 4: Insert BAJA teams
echo "4. Inserting BAJA teams (laptop_id 1-8)...\n";
$baja_teams = [
    [1, 'baja', 'Institut Teknologi Nasional Malang_TRISHA ABINAWA'],
    [2, 'baja', 'Universitas Negeri Malang_Warock'],
    [3, 'baja', 'Universitas Udayana_Abhipraya'],
    [4, 'baja', 'Politeknik Negeri Semarang_Tim Seismastha'],
    [5, 'baja', 'Institut Teknologi Sepuluh Nopember_Askara Team'],
    [6, 'baja', 'Universitas Jember_Alvandaru Team'],
    [7, 'baja', 'Universitas Brawijaya_SRIKANDI'],
    [8, 'baja', 'Politeknik Astra_Astura Team']
];

$stmt = $conn->prepare("INSERT INTO teams (laptop_id, category, nama_tim) VALUES (?, ?, ?)");
foreach ($baja_teams as $team) {
    $stmt->bind_param('iss', $team[0], $team[1], $team[2]);
    $stmt->execute();
    echo "   ✅ Inserted: {$team[2]}\n";
}
echo "\n";

// Step 5: Insert BETON teams
echo "5. Inserting BETON teams (laptop_id 1-8)...\n";
$beton_teams = [
    [1, 'beton', 'Universitas Negeri Yogyakarta_Sahakarya'],
    [2, 'beton', 'Politeknik Negeri Bandung_Wirajaya Palawiri'],
    [3, 'beton', 'Politeknik Negeri Malang_Akral Baswara'],
    [4, 'beton', 'Universitas Warmadewa_EL-BADAK Wanskuy'],
    [5, 'beton', 'Universitas Muhammadiyah Malang_AKTARA'],
    [6, 'beton', 'Institut Teknologi Sepuluh Nopember_Indestrukta Team'],
    [7, 'beton', 'Universitas Negeri Jakarta_Astungkara'],
    [8, 'beton', 'universitas Brawijaya_K-300']
];

foreach ($beton_teams as $team) {
    $stmt->bind_param('iss', $team[0], $team[1], $team[2]);
    $stmt->execute();
    echo "   ✅ Inserted: {$team[2]}\n";
}
echo "\n";

// Step 6: Verify
echo "========================================\n";
echo "VERIFICATION:\n";
echo "========================================\n\n";

$result = $conn->query("SELECT category, COUNT(*) as count FROM teams GROUP BY category");
while ($row = $result->fetch_assoc()) {
    echo "Category '{$row['category']}': {$row['count']} teams\n";
}

$result = $conn->query("SELECT COUNT(*) as total FROM teams");
$row = $result->fetch_assoc();
echo "\nTotal teams: {$row['total']}\n";

echo "\n========================================\n";
echo "✅ MIGRATION COMPLETE!\n";
echo "========================================\n";
echo "\n";
echo "Database structure updated:\n";
echo "  - teams.category (ENUM: baja, beton)\n";
echo "  - sessions.category (ENUM: baja, beton)\n";
echo "  - 16 teams (8 Baja + 8 Beton)\n";
echo "\n";
echo "Next steps:\n";
echo "  1. Refresh admin page\n";
echo "  2. Select 'Beton' category\n";
echo "  3. Start recording\n";
echo "  4. Check user page - should show Beton teams\n";
echo "</pre>";

$conn->close();
