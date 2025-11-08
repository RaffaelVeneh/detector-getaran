# 🚀 DEPLOYMENT CHECKLIST - Sistem Detector Getaran V2

## ✅ Pre-Deployment (Persiapan)

### 1. Backup Data Lama (PENTING!)
- [ ] Export database lama:
  ```sql
  mysqldump -u root -p db_detector_getaran > backup_old_$(date +%Y%m%d).sql
  ```
- [ ] Copy folder project lama:
  ```powershell
  Copy-Item "C:\laragon\www\detector-getaran" `
            "C:\laragon\www\detector-getaran_backup_$(Get-Date -Format 'yyyyMMdd')" `
            -Recurse
  ```

### 2. Verify Prerequisites
- [ ] Laragon running
- [ ] MySQL service active
- [ ] PHP 7.4+ installed (`php -v`)
- [ ] Composer installed (`composer --version`)
- [ ] Port 8080 available:
  ```powershell
  netstat -ano | findstr :8080
  # Output harus kosong (port available)
  ```

---

## 📦 Installation Steps

### 3. Copy Files to Laragon
```powershell
# Jalankan di PowerShell (Run as Administrator jika perlu)
cd C:\Users\ghisy\Downloads\Projek\detector-getaran

# Option A: Copy semua (overwrite existing)
Copy-Item -Path * -Destination "C:\laragon\www\detector-getaran\" -Recurse -Force

# Option B: Selective copy (file baru saja)
$newFiles = @(
    "database_v2.sql",
    "composer.json",
    "websocket_server.php",
    "db_insert_opencv.php",
    "admin_new.html",
    "admin_new.js",
    "tim_client.js",
    "tim_1.html", "tim_2.html", "tim_3.html", "tim_4.html",
    "tim_5.html", "tim_6.html", "tim_7.html", "tim_8.html",
    "style.css",
    "README_COMPLETE.md",
    "DEPLOYMENT_CHECKLIST.md"
)

foreach ($file in $newFiles) {
    Copy-Item $file "C:\laragon\www\detector-getaran\" -Force
    Write-Host "✓ Copied $file" -ForegroundColor Green
}

# Copy folder api/
Copy-Item -Path "api" -Destination "C:\laragon\www\detector-getaran\api" -Recurse -Force
Write-Host "✓ Copied api folder" -ForegroundColor Green
```

**Checklist:**
- [ ] database_v2.sql copied
- [ ] composer.json copied
- [ ] websocket_server.php copied
- [ ] db_insert_opencv.php copied
- [ ] admin_new.html & admin_new.js copied
- [ ] tim_1.html - tim_8.html copied (8 files)
- [ ] tim_client.js copied
- [ ] style.css updated
- [ ] api/ folder copied (all.php, tim_X.php, start/stop/export)
- [ ] README_COMPLETE.md copied

---

### 4. Install Composer Dependencies
```powershell
cd C:\laragon\www\detector-getaran

# Install Ratchet WebSocket library
composer install
```

**Expected Output:**
```
Loading composer repositories with package information
Installing dependencies from lock file
...
Generating autoload files
```

**Checklist:**
- [ ] `vendor/` folder created
- [ ] `composer.lock` file generated
- [ ] No error messages
- [ ] `vendor/autoload.php` exists

---

### 5. Database Setup

#### A. Create Database (jika belum ada)
1. Buka phpMyAdmin: http://localhost/phpmyadmin
2. Login: `root` / `asya2105`
3. Click "New" di sidebar kiri
4. Database name: `db_detector_getaran`
5. Collation: `utf8mb4_general_ci`
6. Click "Create"

**Checklist:**
- [ ] Database `db_detector_getaran` created

#### B. Import Schema V2
1. Select database `db_detector_getaran`
2. Click tab "Import"
3. Choose file: `C:\laragon\www\detector-getaran\database_v2.sql`
4. Click "Go"

**Expected Result:**
```
Import has been successfully finished, 4 queries executed.
```

**Checklist:**
- [ ] Import success (no errors)
- [ ] 4 tables created: teams, sessions, realtime_data, statistics
- [ ] Triggers created: after_insert_realtime_data
- [ ] Stored procedures created: update_statistics
- [ ] Views created: v_latest_data, v_session_statistics

#### C. Verify Tables
```sql
-- Run di phpMyAdmin SQL tab
SHOW TABLES;
-- Expected: teams, sessions, realtime_data, statistics

DESCRIBE teams;
-- Expected: id, laptop_id (UNIQUE), nama_tim, created_at

DESCRIBE sessions;
-- Expected: id, frequency, started_at, stopped_at, status, auto_stopped

DESCRIBE realtime_data;
-- Expected: id, session_id, laptop_id, dista, distb, frequency, relative_time, created_at

DESCRIBE statistics;
-- Expected: id, session_id, laptop_id, max_dista, max_distb, avg_dista, avg_distb, updated_at

-- Cek triggers
SHOW TRIGGERS;
-- Expected: after_insert_realtime_data

-- Cek stored procedures
SHOW PROCEDURE STATUS WHERE Db = 'db_detector_getaran';
-- Expected: update_statistics
```

**Checklist:**
- [ ] All tables exist dengan struktur benar
- [ ] Trigger `after_insert_realtime_data` exists
- [ ] Stored procedure `update_statistics` exists

---

### 6. Insert Initial Team Data
```sql
-- Run di phpMyAdmin SQL tab
INSERT INTO teams (laptop_id, nama_tim) VALUES
(1, 'Tim 1'),
(2, 'Tim 2'),
(3, 'Tim 3'),
(4, 'Tim 4'),
(5, 'Tim 5'),
(6, 'Tim 6'),
(7, 'Tim 7'),
(8, 'Tim 8');

-- Verify
SELECT * FROM teams ORDER BY laptop_id;
```

**Expected Result:**
```
8 rows inserted.
```

**Checklist:**
- [ ] 8 tim inserted (laptop_id 1-8)
- [ ] No duplicate key errors

---

## 🔧 Configuration

### 7. Verify db_config.php
```powershell
cd C:\laragon\www\detector-getaran
notepad db_config.php
```

**Content harus:**
```php
<?php
$servername = "localhost";
$username = "root";
$password = "asya2105";
$dbname = "db_detector_getaran";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}
?>
```

**Checklist:**
- [ ] Password = `asya2105`
- [ ] Database = `db_detector_getaran`
- [ ] File saved

---

## 🚀 Launch Services

### 8. Start WebSocket Server
```powershell
cd C:\laragon\www\detector-getaran
php websocket_server.php
```

**Expected Output:**
```
WebSocket server started on port 8080
Waiting for connections...
```

**Checklist:**
- [ ] Server started (no errors)
- [ ] Port 8080 listening
- [ ] Keep terminal OPEN (jangan close!)

⚠️ **IMPORTANT**: Buka terminal baru untuk testing, jangan close yang ini!

---

## 🧪 Testing

### 9. Test Admin Page
1. Buka browser: http://localhost/detector-getaran/admin_new.html
2. Cek navbar loaded
3. Cek connection status = "Connected" (hijau)
4. Cek timer display = "00:00"
5. Cek stats table kosong (8 rows)
6. Cek 2 grafik kosong (Lantai 3 & 10)

**Console Check (F12):**
```javascript
// Expected output:
WebSocket connected
Received: initial_data
```

**Checklist:**
- [ ] Page loaded tanpa error 404
- [ ] WebSocket status "Connected" (hijau)
- [ ] No console errors
- [ ] Charts rendered (kosong OK)
- [ ] Stats table 8 rows (Tim 1-8)

---

### 10. Test Timer Control
1. Select frequency: `1.5 Hz`
2. Click "Mulai Rekaman"
3. Timer harus start counting (00:01, 00:02, dst)
4. Frequency selector disabled saat recording
5. Button berubah jadi "Stop Rekaman" (merah)

**Database Check:**
```sql
SELECT * FROM sessions ORDER BY id DESC LIMIT 1;
-- Expected: frequency=1.5, status='recording', started_at=NOW()
```

**Checklist:**
- [ ] Timer started
- [ ] Session created di database
- [ ] Frequency selector disabled
- [ ] Button text changed to "Stop Rekaman"

6. Wait 10 seconds, then click "Stop Rekaman"
7. Timer stop
8. Button back to "Mulai Rekaman" (hijau)

**Database Check:**
```sql
SELECT * FROM sessions ORDER BY id DESC LIMIT 1;
-- Expected: status='completed', stopped_at=NOW(), auto_stopped=0
```

**Checklist:**
- [ ] Timer stopped
- [ ] Session stopped di database
- [ ] Frequency selector enabled again

---

### 11. Test Tim Page
1. Buka: http://localhost/detector-getaran/tim_1.html
2. Cek navbar loaded
3. Cek connection status = "Connected"
4. Cek session info bar (frequency=-, status="Tidak Ada Sesi", timer=00:00)
5. Cek 5 frequency tabs (1.5, 2.5, 3.5, 4.5, 5.5)
6. Cek 2 graph cards (Lantai 3 & 10)
7. Cek stats display (Realtime/Max/Avg)

**Console Check:**
```javascript
// Expected:
WebSocket connected
Received: team_data
```

**Checklist:**
- [ ] Page loaded tanpa error
- [ ] WebSocket connected
- [ ] Team name = "Tim 1"
- [ ] Graphs rendered
- [ ] All 5 frequency tabs visible

---

### 12. Test Data Flow (Simulated OpenCV)

#### A. Insert Dummy Data via API
```powershell
# Buka terminal BARU (jangan yang running WebSocket server)
cd C:\laragon\www\detector-getaran

# Simulate OpenCV POST
$body = @{
    laptop_id = 1
    is_a_detected = 1
    is_b_detected = 1
    dista = 5.23
    distb = 3.87
    frequency = 1.5
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost/detector-getaran/db_insert_opencv.php" `
                  -Method POST `
                  -Body $body `
                  -ContentType "application/json"
```

**Expected Response:**
```json
{"status":"success","message":"Data inserted successfully","session_id":1}
```

#### B. Verify Database
```sql
SELECT * FROM realtime_data ORDER BY id DESC LIMIT 1;
-- Expected: laptop_id=1, dista=5.23, distb=3.87, frequency=1.5

SELECT * FROM statistics WHERE laptop_id=1 ORDER BY id DESC LIMIT 1;
-- Expected: max_dista=5.23, max_distb=3.87, avg_dista=5.23, avg_distb=3.87
```

#### C. Verify WebSocket Broadcast
**WebSocket Terminal Output:**
```
New data broadcast: 1 records
```

#### D. Verify Admin Page Update
1. Refresh admin page
2. Stats table row Tim 1 harus update:
   - Realtime A = 5.23 mm
   - Max A = 5.23 mm
   - Realtime B = 3.87 mm
   - Max B = 3.87 mm
3. Grafik harus muncul 1 bar

#### E. Verify Tim 1 Page Update
1. Refresh tim_1.html
2. Tab 1.5 Hz aktif
3. Grafik Lantai 3 & 10 muncul data
4. Stats display update

**Checklist:**
- [ ] POST request success (200 OK)
- [ ] Data inserted ke realtime_data
- [ ] Statistics updated
- [ ] WebSocket broadcast triggered
- [ ] Admin page charts updated
- [ ] Tim page graphs updated

---

### 13. Test Auto-Stop at 60 Seconds

⚠️ **This test requires patience (60+ seconds)**

#### A. Start Recording Session
1. Admin page → Select frequency 2.5 Hz
2. Click "Mulai Rekaman"
3. Timer starts

#### B. Insert Dummy Data Every Second (Simulate OpenCV)
```powershell
# Run script loop untuk insert 65 data points
for ($i = 1; $i -le 65; $i++) {
    $body = @{
        laptop_id = 2
        is_a_detected = 1
        is_b_detected = 1
        dista = (Get-Random -Minimum 1.0 -Maximum 10.0)
        distb = (Get-Random -Minimum 1.0 -Maximum 10.0)
        frequency = 2.5
    } | ConvertTo-Json
    
    Invoke-WebRequest -Uri "http://localhost/detector-getaran/db_insert_opencv.php" `
                      -Method POST `
                      -Body $body `
                      -ContentType "application/json"
    
    Write-Host "Data $i inserted" -ForegroundColor Green
    Start-Sleep -Seconds 1
}
```

#### C. Observe Behavior
- Timer terus count sampai 60 detik
- Setelah 60 detik:
  - Session auto-stop
  - Button back to "Mulai Rekaman"
  - Frequency selector enabled
  - Status changed to "Tidak Ada Sesi"

#### D. Verify Database
```sql
SELECT * FROM sessions ORDER BY id DESC LIMIT 1;
-- Expected:
-- frequency = 2.5
-- status = 'completed'
-- auto_stopped = 1  <-- IMPORTANT!
-- stopped_at NOT NULL

SELECT COUNT(*) FROM realtime_data WHERE session_id = (
    SELECT id FROM sessions ORDER BY id DESC LIMIT 1
);
-- Expected: ~60 records (satu per detik)
```

**Checklist:**
- [ ] Timer auto-stop at 60 seconds
- [ ] Session marked auto_stopped=1
- [ ] No data inserted after 60 seconds
- [ ] Admin UI reset to idle state

---

### 14. Test CSV Export

#### A. Export Realtime CSV (Tim 1)
1. Buka: http://localhost/detector-getaran/api/export_realtime.php?laptop_id=1
2. Download CSV file
3. Open with Excel/Notepad

**Expected Columns:**
```
Timestamp,Team_Name,Realtime_Disp_A,Max_Disp_A,Avg_Disp_A,Realtime_Disp_B,Max_Disp_B,Avg_Disp_B,Frequency
2025-01-XX 10:30:15,Tim 1,5.23,5.23,5.23,3.87,3.87,3.87,1.5
```

**Checklist:**
- [ ] CSV downloaded successfully
- [ ] Header row correct
- [ ] Data rows exist
- [ ] No SQL errors

#### B. Export Session CSV (Tim 2)
1. Buka: http://localhost/detector-getaran/api/export_session.php?laptop_id=2
2. Download CSV file

**Expected Columns:**
```
Waktu_Detik,Team_Name,Avg_Disp_A,Max_Disp_A,Realtime_Disp_A,Avg_Disp_B,Max_Disp_B,Realtime_Disp_B,Frequency
00:01,Tim 2,4.56,4.56,4.56,3.21,3.21,3.21,2.5
00:02,Tim 2,4.78,5.12,5.12,3.45,3.89,3.89,2.5
...
```

**Checklist:**
- [ ] CSV downloaded
- [ ] Waktu_Detik in MM:SS format
- [ ] Only session data (not all realtime data)
- [ ] Grouped by session_id

---

## 🧹 Cleanup (Optional)

### 15. Delete Old/Unused Files
```powershell
cd C:\laragon\www\detector-getaran

# List files to delete
$oldFiles = @(
    "api_teams.php",
    "api_save_test.php",
    "visualisasi.html",
    "visualisasi.js",
    "admin.html",
    "admin.js",
    "test_connection.php",
    "check_db.php",
    "debug_api.php",
    "database.example.sql",
    "test_database.sql"
)

# Delete (with confirmation)
foreach ($file in $oldFiles) {
    if (Test-Path $file) {
        Remove-Item $file -Confirm
        Write-Host "Deleted $file" -ForegroundColor Yellow
    }
}
```

**Checklist:**
- [ ] Old files deleted (optional, bisa keep for reference)

---

## 📊 Production Readiness

### 16. Final Checklist

#### Database
- [ ] All tables created
- [ ] Triggers working
- [ ] Stored procedures working
- [ ] Initial team data inserted (8 rows)

#### Backend
- [ ] Composer dependencies installed
- [ ] WebSocket server running (port 8080)
- [ ] db_config.php correct credentials
- [ ] All API endpoints accessible
- [ ] db_insert_opencv.php tested

#### Frontend
- [ ] Admin page loaded & functional
- [ ] All 8 tim pages loaded
- [ ] WebSocket connection working
- [ ] Charts rendering correctly
- [ ] Timer control working
- [ ] CSV export working

#### Data Flow
- [ ] OpenCV → Database (POST tested)
- [ ] Database → WebSocket (broadcast tested)
- [ ] WebSocket → Clients (update tested)
- [ ] Auto-stop at 60s working
- [ ] Statistics auto-update working

#### Performance
- [ ] Page load < 2 seconds
- [ ] Chart update smooth (no lag)
- [ ] WebSocket reconnect working
- [ ] No memory leaks (test 1+ hour)

---

## 🎉 Deployment Complete!

### Access URLs:
- **Admin**: http://localhost/detector-getaran/admin_new.html
- **Tim 1**: http://localhost/detector-getaran/tim_1.html
- **Tim 2**: http://localhost/detector-getaran/tim_2.html
- ... (hingga tim_8.html)

### OpenCV Integration:
```python
# Example Python script untuk OpenCV
import requests
import json

def send_vibration_data(laptop_id, dista, distb, frequency):
    url = "http://localhost/detector-getaran/db_insert_opencv.php"
    data = {
        "laptop_id": laptop_id,
        "is_a_detected": 1 if abs(dista) > 0.1 else 0,
        "is_b_detected": 1 if abs(distb) > 0.1 else 0,
        "dista": dista,
        "distb": distb,
        "frequency": frequency
    }
    
    try:
        response = requests.post(url, json=data)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
    except Exception as e:
        print(f"Error: {e}")

# Usage
send_vibration_data(
    laptop_id=1,
    dista=5.23,
    distb=3.87,
    frequency=1.5
)
```

---

## 📞 Troubleshooting Reference

| Issue | Solution |
|-------|----------|
| WebSocket not connecting | Restart `php websocket_server.php` |
| Port 8080 in use | Kill process: `taskkill /PID <PID> /F` |
| Charts not rendering | Clear browser cache + hard refresh (Ctrl+Shift+R) |
| Database connection error | Check `db_config.php` credentials |
| CSV export empty | Verify data exists in `realtime_data` table |
| Timer not auto-stopping | Check `db_insert_opencv.php` relative_time logic |
| Stats not updating | Verify trigger `after_insert_realtime_data` exists |

---

## ✅ Sign-off

**Deployment Date**: _______________  
**Deployed By**: ___________________  
**Verified By**: ___________________  

**Status**: 🟢 Production Ready

---

**Last Updated**: 2025-01-XX  
**Version**: V2.0
