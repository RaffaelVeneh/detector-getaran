# CATEGORY SYSTEM IMPLEMENTATION - PROGRESS REPORT

## ✅ COMPLETED

### 1. **migration_add_category_system.sql** ✅
- ALTER TABLE teams: Add category column (PRIMARY KEY: laptop_id, category)
- ALTER TABLE sessions: Add category column  
- INSERT 16 team names (8 Baja + 8 Beton)

### 2. **admin_new_v3.html** ✅
- Added category dropdown (Baja/Beton) before frequency dropdown

### 3. **admin_new_v3.js** ✅ (PARTIAL - Need to continue)
- Added currentCategory variable (default: 'baja')
- Changed dataByTeamAndFreq structure: `{ 'baja': {...}, 'beton': {...} }`
- Added teamNamesBaja and teamNamesBeton arrays
- Updated initializeDataStructure() for both categories
- Added handleCategoryChange() function
- Updated startRecording() to send category
- Updated processNewData() to filter by category
- Updated updateChart() to use currentCategory
- Updated updateStatsTable() to use currentCategory
- Disabled category selector during recording

---

## 🔄 IN PROGRESS / TODO

### 4. **Update tim_1_v3.html to tim_8_v3.html** (Need to do for ALL 8 files)

Add dynamic category label and team name in navbar:

```html
<nav class="navbar">
    <div class="nav-left">
        <img src="logo-uny.png" alt="Logo UNY" class="logo-uny">
        <h1 class="nav-title">
            <span id="teamName">Loading...</span> - 
            Kategori: <span id="categoryLabel">Baja</span>
        </h1>
    </div>
    <div class="nav-right">
        <div class="connection-status" id="wsStatus">
            <span class="status-dot"></span> Connecting...
        </div>
    </div>
</nav>
```

**Files to update:**
- tim_1_v3.html
- tim_2_v3.html
- tim_3_v3.html
- tim_4_v3.html
- tim_5_v3.html
- tim_6_v3.html
- tim_7_v3.html
- tim_8_v3.html

---

### 5. **tim_client_v3.js** (Need to add)

Add category handling:

```javascript
// Add at top with other variables
let currentCategory = 'baja'; // Default

// In ws.onmessage, add handler:
if (message.type === 'category_change') {
    currentCategory = message.category;
    updateCategoryDisplay(message.category);
    loadTeamName(LAPTOP_ID, message.category);
}

// In handleSessionStart, add:
if (data.category) {
    currentCategory = data.category;
    updateCategoryDisplay(data.category);
}

// Add new functions:
function updateCategoryDisplay(category) {
    const categoryLabel = document.getElementById('categoryLabel');
    if (categoryLabel) {
        categoryLabel.textContent = category === 'baja' ? 'Baja' : 'Beton';
    }
}

async function loadTeamName(laptopId, category) {
    try {
        const response = await fetch(`/detector-getaran/api/get_team_info.php?laptop_id=${laptopId}&category=${category}`);
        const data = await response.json();
        
        const teamNameEl = document.getElementById('teamName');
        if (teamNameEl && data.nama_tim) {
            teamNameEl.textContent = data.nama_tim;
        }
    } catch (error) {
        console.error('Error loading team name:', error);
    }
}

// Call on DOMContentLoaded:
document.addEventListener('DOMContentLoaded', () => {
    // ... existing code ...
    loadTeamName(LAPTOP_ID, currentCategory); // Load initial team name
});
```

---

### 6. **websocket_server.php** (Need to update)

Update to handle category_change broadcast and include category in events:

```php
// In onMessage handler, add:
if (isset($data['type']) && $data['type'] === 'category_change') {
    // Broadcast category change to all clients
    $message = json_encode([
        'type' => 'category_change',
        'category' => $data['category'],
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
    foreach ($this->clients as $client) {
        $client->send($message);
    }
    
    echo "Broadcasted category_change: {$data['category']}\n";
}

// In checkSessionChanges(), add category to broadcast:
$message = json_encode([
    'type' => 'session_started',
    'session_id' => $currentSession['id'],
    'frequency' => $currentSession['frequency'],
    'category' => $currentSession['category'], // ADD THIS
    'started_at' => $currentSession['started_at'],
    'elapsed_seconds' => $currentSession['elapsed_seconds'],
    'timestamp' => date('Y-m-d H:i:s')
]);

// In checkNewData query, JOIN with sessions to get category:
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
            s.category as category  -- ADD THIS
          FROM realtime_data rd
          INNER JOIN teams t ON rd.laptop_id = t.laptop_id AND t.category = s.category
          LEFT JOIN sessions s ON rd.session_id = s.id
          WHERE rd.timestamp > ?
          ORDER BY rd.timestamp ASC
          LIMIT 100";
```

---

### 7. **api/start_timer.php** (Need to update)

Accept category parameter:

```php
$input = json_decode(file_get_contents('php://input'), true);
$frequency = floatval($input['frequency']);
$category = $input['category'] ?? 'baja'; // Default baja

// INSERT session with category
$query = "INSERT INTO sessions (frequency, category, status, started_at) 
          VALUES (?, ?, 'running', NOW())";
$stmt = $conn->prepare($query);
$stmt->bind_param('ds', $frequency, $category);
```

---

### 8. **api/export_realtime.php** (Need to update)

Add category column in CSV export:

```php
// Update query to JOIN with sessions and teams
$query = "SELECT 
    rd.id,
    rd.laptop_id,
    t.nama_tim,
    s.category,  -- ADD THIS
    rd.frequency,
    rd.dista,
    rd.distb,
    rd.is_a_detected,
    rd.is_b_detected,
    rd.timestamp,
    rd.relative_time,
    rd.session_id
FROM realtime_data rd
LEFT JOIN sessions s ON rd.session_id = s.id
LEFT JOIN teams t ON rd.laptop_id = t.laptop_id AND t.category = s.category
ORDER BY rd.timestamp DESC";

// Update CSV header
$headers = ['ID', 'Laptop ID', 'Nama Tim', 'Kategori', 'Frequency', 'Dist A', 'Dist B', 'Detected A', 'Detected B', 'Timestamp', 'Relative Time', 'Session ID'];

// Update row data
$row = [
    $row['id'],
    $row['laptop_id'],
    $row['nama_tim'],
    $row['category'], // ADD THIS
    $row['frequency'],
    $row['dista'],
    $row['distb'],
    $row['is_a_detected'],
    $row['is_b_detected'],
    $row['timestamp'],
    $row['relative_time'],
    $row['session_id']
];
```

---

### 9. **api/export_session.php** (Need to update)

Same as export_realtime.php - add category column in JOIN and CSV output.

---

### 10. **api/get_team_info.php** (Need to create NEW file)

Create new API endpoint for dynamic team name loading:

```php
<?php
header('Content-Type: application/json');
require_once '../db_config.php';

$laptop_id = intval($_GET['laptop_id'] ?? 0);
$category = $_GET['category'] ?? 'baja';

if ($laptop_id < 1 || $laptop_id > 8) {
    echo json_encode(['error' => 'Invalid laptop_id']);
    exit;
}

$query = "SELECT nama_tim FROM teams WHERE laptop_id = ? AND category = ?";
$stmt = $conn->prepare($query);
$stmt->bind_param('is', $laptop_id, $category);
$stmt->execute();
$result = $stmt->get_result();

if ($row = $result->fetch_assoc()) {
    echo json_encode([
        'laptop_id' => $laptop_id,
        'category' => $category,
        'nama_tim' => $row['nama_tim']
    ]);
} else {
    echo json_encode(['error' => 'Team not found']);
}

$stmt->close();
$conn->close();
?>
```

---

## 🚀 DEPLOYMENT STEPS

1. **Run migration SQL:**
   ```bash
   mysql -u root -p db_detector_getaran < migration_add_category_system.sql
   ```

2. **Update all tim_X_v3.html files** (8 files)

3. **Update tim_client_v3.js** with category handling

4. **Update websocket_server.php** with category broadcast

5. **Update api/start_timer.php** to accept category

6. **Update api/export_realtime.php** with category column

7. **Update api/export_session.php** with category column

8. **Create api/get_team_info.php** for dynamic team names

9. **Test:**
   - Admin: Switch category → Check charts update
   - User: Check navbar category label changes
   - Start recording → Check category saved in DB
   - Export CSV → Check category column exists

---

## ⚠️ IMPORTANT NOTES

- **Laptop ID 1-8** dipakai untuk KEDUA kategori (Baja dan Beton)
- **Database**: Data dibedakan dengan (laptop_id, category) composite key
- **Session**: Setiap session dicatat kategorinya
- **WebSocket**: Broadcast category_change saat admin switch
- **Team Names**: Dinamis, load dari database berdasarkan laptop_id + category

---

**Last Updated**: November 10, 2025
**Status**: 40% Complete (4/10 tasks done)
