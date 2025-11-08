# 🌋 Sistem Detector Getaran - V2 (8-Team Real-Time System)

## 📋 Deskripsi
Sistem monitoring getaran gempa secara real-time untuk **8 tim simultan** dengan kontrol admin terpusat. Sistem menggunakan **WebSocket** untuk update real-time dan mendukung recording session per frekuensi dengan auto-stop.

---

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────┐
│                    8 LAPTOP OPENCV                          │
│  (Laptop 1-8 mengirim data via POST ke db_insert_opencv.php) │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │   MySQL Database      │
        │  (db_detector_getaran)│
        └──────────┬────────────┘
                   │
                   ▼
        ┌─────────────────────┐
        │ WebSocket Server     │
        │ (Port 8080)          │
        │ - Polling DB 100ms   │
        │ - Broadcast semua    │
        └──────────┬───────────┘
                   │
          ┌────────┴────────┐
          │                 │
          ▼                 ▼
    ┌──────────┐      ┌────────────┐
    │  Admin   │      │ Tim 1-8    │
    │  Page    │      │  Pages     │
    └──────────┘      └────────────┘
```

---

## 🗂️ Struktur Database

### Tables:
1. **teams** - Data 8 tim (laptop_id, nama_tim)
2. **sessions** - Recording session per frekuensi (frequency, started_at, stopped_at, status, auto_stopped)
3. **realtime_data** - Data real-time dari OpenCV (session_id, laptop_id, dista, distb, frequency, relative_time)
4. **statistics** - Statistik per session per tim (max_dista, max_distb, avg_dista, avg_distb)

### Triggers:
- `after_insert_realtime_data` - Auto update statistics setiap insert data baru

### Stored Procedures:
- `update_statistics` - Update max/avg displacement untuk tim tertentu

---

## 📁 File Structure

```
detector-getaran/
│
├── database_v2.sql              # Schema lengkap dengan triggers & procedures
├── composer.json                # Dependencies (Ratchet WebSocket)
├── websocket_server.php         # WebSocket server (port 8080)
├── db_insert_opencv.php         # Endpoint untuk OpenCV POST data
│
├── api/
│   ├── all.php                  # Get data semua tim
│   ├── tim_1.php - tim_8.php   # Get data per tim (grouped by frequency)
│   ├── start_timer.php          # POST: Start session dengan frequency
│   ├── stop_timer.php           # POST: Stop session (manual/auto)
│   ├── export_realtime.php      # CSV export semua realtime data
│   └── export_session.php       # CSV export per session (start-stop)
│
├── admin_new.html               # Admin monitoring page
├── admin_new.js                 # Admin WebSocket client & stacked charts
│
├── tim_1.html - tim_8.html      # Individual team monitoring pages
├── tim_client.js                # Shared WebSocket client untuk tim pages
│
├── style.css                    # Complete styling (termasuk komponen baru)
├── db_config.php                # Database config (root/asya2105)
│
└── README_COMPLETE.md           # Dokumentasi lengkap (file ini)
```

---

## ⚙️ Setup & Installation

### 1️⃣ Prerequisites
- **Laragon** (atau XAMPP dengan PHP 7.4+, MySQL, Composer)
- **Browser** modern (Chrome, Firefox, Edge)
- **Git** (optional, untuk version control)

### 2️⃣ Installation Steps

#### A. Copy Files ke Laragon
```powershell
# Copy semua file ke Laragon www directory
Copy-Item -Path "C:\Users\ghisy\Downloads\Projek\detector-getaran\*" `
          -Destination "C:\laragon\www\detector-getaran\" `
          -Recurse -Force
```

#### B. Install Composer Dependencies
```powershell
cd C:\laragon\www\detector-getaran
composer install
```

#### C. Import Database
1. Buka **phpMyAdmin**: http://localhost/phpmyadmin
2. Login: `root` / `asya2105`
3. Create database: `db_detector_getaran` (jika belum ada)
4. Import file: `database_v2.sql`
5. Verify tables: teams, sessions, realtime_data, statistics

#### D. Verify Database Config
File `db_config.php` harus berisi:
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

#### E. Start WebSocket Server
```powershell
cd C:\laragon\www\detector-getaran
php websocket_server.php
```

**Output yang benar:**
```
WebSocket server started on port 8080
Waiting for connections...
```

⚠️ **PENTING**: Jangan close terminal ini! WebSocket server harus running terus.

---

## 🚀 Usage Guide

### 🔴 Admin Page

#### URL: `http://localhost/detector-getaran/admin_new.html`

**Features:**
1. **Connection Status** - Cek koneksi WebSocket (hijau = connected)
2. **Timer Control**:
   - Select frequency (1.5, 2.5, 3.5, 4.5, 5.5 Hz)
   - Click "Mulai Rekaman" untuk start session
   - Auto-stop at 60 seconds (atau manual click "Stop Rekaman")
3. **Stats Table** - Realtime/Max/Avg semua 8 tim
4. **Stacked Graphs**:
   - Grafik Lantai 3 (dista) - 8 tim overlay
   - Grafik Lantai 10 (distb) - 8 tim overlay
   - Transparansi 20% untuk semua line
   - Highlight max displacement (opacity 100%)

**How to Use:**
1. Pastikan WebSocket server running
2. Buka admin page
3. Cek status "Connected" (hijau)
4. Pilih frequency (start 1.5 Hz)
5. Click "Mulai Rekaman"
6. Monitor grafik & stats real-time
7. Setelah 60 detik auto-stop (atau manual stop)
8. Ulangi untuk frequency 2.5, 3.5, 4.5, 5.5 Hz

---

### 🟢 Tim Pages

#### URLs:
- Tim 1: `http://localhost/detector-getaran/tim_1.html`
- Tim 2: `http://localhost/detector-getaran/tim_2.html`
- ... (hingga tim_8.html)

**Features:**
1. **Connection Status** - WebSocket connection indicator
2. **Session Info Bar**:
   - Current frequency
   - Session status
   - Timer (MM:SS)
3. **Frequency Tabs** - Switch between 5 frequencies (1.5, 2.5, 3.5, 4.5, 5.5 Hz)
4. **Individual Graphs**:
   - Lantai 3 (dista) - Green/Red spike bars
   - Lantai 10 (distb) - Blue/Orange spike bars
5. **Stats Display** - Realtime/Max/Avg per graph
6. **Export Buttons**:
   - Export Realtime CSV (semua data)
   - Export Session CSV (hanya recording session)

**How to Use:**
1. Buka tim page sesuai laptop ID
2. Cek status "Connected"
3. Tab frequency sesuai session admin
4. Monitor grafik realtime
5. Export CSV jika butuh data

---

## 📊 Data Flow

### OpenCV → Database
```
1. OpenCV detect getaran
2. POST ke db_insert_opencv.php
   Body: {
       laptop_id: 1-8,
       is_a_detected: 0/1,
       is_b_detected: 0/1,
       dista: float (mm),
       distb: float (mm),
       frequency: 1.5/2.5/3.5/4.5/5.5
   }
3. Script cek:
   - Ada session aktif?
   - Relative_time < 60 detik?
4. Insert ke realtime_data
5. Trigger auto update statistics
6. Jika relative_time >= 60: auto-stop session
```

### Database → WebSocket → Clients
```
1. WebSocket server polling DB tiap 100ms
2. Cek ada data baru (belum di-broadcast)
3. Broadcast ke SEMUA connected clients:
   {
       type: 'new_data',
       data: [array of new realtime_data],
       timestamp: current_time
   }
4. Admin & Tim pages terima update
5. Update charts & stats real-time
```

---

## 📤 Export CSV

### 1️⃣ Export Realtime (All Data)
**Endpoint**: `/api/export_realtime.php?laptop_id=X`

**Columns:**
- Timestamp
- Team_Name
- Realtime_Disp_A (mm)
- Max_Disp_A (mm)
- Avg_Disp_A (mm/s)
- Realtime_Disp_B (mm)
- Max_Disp_B (mm)
- Avg_Disp_B (mm/s)
- Frequency (Hz)

**Use Case**: Semua data yang pernah terekam (untuk analisis lengkap)

---

### 2️⃣ Export Session (Start-Stop Recording)
**Endpoint**: `/api/export_session.php?laptop_id=X`

**Columns:**
- Waktu_Detik (MM:SS format)
- Team_Name
- Avg_Disp_A (mm/s)
- Max_Disp_A (mm)
- Realtime_Disp_A (mm)
- Avg_Disp_B (mm/s)
- Max_Disp_B (mm)
- Realtime_Disp_B (mm)
- Frequency (Hz)

**Use Case**: Data saat admin start/stop (untuk session recording)

---

## 🛠️ Troubleshooting

### ❌ WebSocket Connection Failed
**Symptoms**: Status "Disconnected" merah, data ga update

**Solutions:**
1. Cek WebSocket server running:
   ```powershell
   # Cek process
   Get-Process | Where-Object {$_.ProcessName -like "*php*"}
   
   # Jika ga ada, start server
   cd C:\laragon\www\detector-getaran
   php websocket_server.php
   ```

2. Cek port 8080 available:
   ```powershell
   netstat -ano | findstr :8080
   ```

3. Restart browser & clear cache

---

### ❌ Charts Not Updating
**Symptoms**: Grafik stuck, ga ada update

**Solutions:**
1. F12 → Console → Cek error JavaScript
2. Verify WebSocket connected (hijau)
3. Cek database ada data baru:
   ```sql
   SELECT * FROM realtime_data ORDER BY id DESC LIMIT 10;
   ```
4. Restart WebSocket server

---

### ❌ Timer Not Auto-Stop at 60s
**Symptoms**: Timer lewat 60 detik, session masih aktif

**Solutions:**
1. Cek logic di `db_insert_opencv.php`:
   ```php
   // Harus ada ini
   if ($relative_time >= 60) {
       $stop_query = "UPDATE sessions SET ...";
   }
   ```

2. Manual stop via admin page
3. Cek session table:
   ```sql
   SELECT * FROM sessions WHERE status = 'recording';
   ```

---

### ❌ Export CSV Empty
**Symptoms**: Download CSV tapi isinya kosong/header only

**Solutions:**
1. Cek parameter laptop_id benar (1-8)
2. Verify ada data di database:
   ```sql
   SELECT * FROM realtime_data WHERE laptop_id = 1;
   ```
3. Cek session_id not null (untuk export session)

---

## 🔧 Development Notes

### File yang SUDAH TIDAK DIPAKAI (bisa dihapus):
- `api_teams.php` (old CRUD)
- `api_save_test.php` (old save system)
- `visualisasi.html` & `visualisasi.js` (old single-team viz)
- `admin.html` & `admin.js` (old admin)
- Test files: `test_connection.php`, `check_db.php`, `debug_api.php`
- Old database: `database.example.sql`, `test_database.sql`

### Customization Tips:

#### 1️⃣ Ubah Warna Tim (Admin Stacked Charts)
Edit `admin_new.js`:
```javascript
const teamColors = [
    'rgb(255, 99, 132)',   // Tim 1 - Merah
    'rgb(54, 162, 235)',   // Tim 2 - Biru
    // ... dst, ubah sesuai selera
];
```

#### 2️⃣ Ubah Threshold Auto-Stop
Edit `db_insert_opencv.php`:
```php
// Default 60 detik, ubah jadi 120 detik:
if ($relative_time >= 120) {
    // auto-stop logic
}
```

#### 3️⃣ Tambah Frequency Baru
1. Update database session frequency enum
2. Tambah option di admin frequency selector
3. Tambah tab di tim pages
4. Update `dataByFrequency` object di JavaScript

---

## 📞 Support

**Jika ada error/bug:**
1. Cek console browser (F12)
2. Cek log WebSocket server (terminal)
3. Cek error.log PHP (C:\laragon\www\detector-getaran\logs)
4. Restart semua service (Laragon + WebSocket)

**Database Issues:**
```sql
-- Reset statistics
TRUNCATE TABLE statistics;

-- Reset sessions
TRUNCATE TABLE sessions;

-- Reset realtime_data (HATI-HATI: Data hilang!)
TRUNCATE TABLE realtime_data;
```

---

## 🎓 Credits

- **Developer**: GitHub Copilot Assistant
- **Framework**: Vanilla JS + Chart.js + Ratchet WebSocket
- **Database**: MySQL dengan triggers & stored procedures
- **Styling**: Custom CSS (Blue & White theme)

---

## 📝 Version History

### V2.0 (Latest) - Major Overhaul
✅ 8-team simultaneous support
✅ WebSocket real-time updates
✅ Admin timer control per frequency
✅ Stacked charts admin (8 teams overlay)
✅ Individual team pages (5 sub-graphs)
✅ Dual CSV export (realtime + session)
✅ Auto-stop at 60 seconds
✅ Session-based recording

### V1.0 (Deprecated)
- Single-team system
- Polling-based updates
- Manual timer only
- Simple visualization

---

**Last Updated**: 2025-01-XX  
**Status**: Production Ready ✅
