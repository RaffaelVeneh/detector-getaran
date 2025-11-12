# New Data Flow Mechanism - Realtime Control vs Session Recording

## 🔄 Mekanisme Baru (Updated)

### Konsep Dasar: 2 Fungsi Terpisah

#### 1. **"Mulai Data Realtime"** = Data Flow Control (Keran Utama)
- **Fungsi:** Mengontrol apakah data **MASUK atau TIDAK** sama sekali
- **Lokasi:** Toggle button selalu visible di admin
- **Default:** OFF (data tidak masuk)
- **Jika ON:**
  - Data dari kamera **diterima dan diproses**
  - Data **ditampilkan di grafik** (admin + user)
  - Data **disimpan ke database** (tabel `realtime_data`)
  - Export Realtime akan berisi data ini
- **Jika OFF:**
  - Data dari kamera **DITOLAK** oleh API
  - **Tidak ada data** yang masuk ke sistem
  - Grafik **tetap kosong/freeze**
  - Database **tidak ada INSERT**

#### 2. **"Mulai Rekaman"** = Session & Timer Control
- **Fungsi:** Hanya mengontrol **TIMER** dan create **SESSION**
- **Lokasi:** Button di control panel admin
- **Default:** OFF (tidak ada session)
- **Jika ON:**
  - Timer mulai jalan: 00:00 → 00:60 (60 detik)
  - Session dibuat di database dengan `session_id`
  - Frequency aktif ditentukan
  - **Data yang masuk** saat session ini akan dapat `session_id` otomatis
  - Export Session akan berisi data dengan `session_id` ini
- **Jika OFF:**
  - Timer stop atau 00:00
  - Tidak ada session aktif
  - Data yang masuk tidak punya `session_id` (NULL)

## 📊 Alur Kerja Detail

### Scenario 1: Realtime Data Only (Tanpa Session)
```
Admin: [Mulai Data Realtime] ON
       [Mulai Rekaman] OFF

Kamera → Send data
      ↓
API: Flag check → ENABLED ✅
     → Data diterima
     → INSERT database (session_id = NULL)
     → Broadcast WebSocket
      ↓
User: Grafik update real-time
      Timer: 00:00 (tidak jalan)
      Status: "Tidak Ada Sesi"
      Data Saving: "Aktif" (hijau)

Database:
  realtime_data:
    - session_id: NULL
    - laptop_id: 1
    - dista/distb: ada nilai
    - timestamp: ada
    - relative_time: NULL
    
Export Realtime: ✅ Ada data (semua data sejak toggle ON)
Export Session: ❌ Tidak ada data (karena session_id = NULL)
```

### Scenario 2: Session + Realtime (Normal Recording)
```
Admin: [Mulai Data Realtime] ON (step 1)
       [Mulai Rekaman] ON (step 2)

Kamera → Send data
      ↓
API: Flag check → ENABLED ✅
     Session check → ACTIVE ✅ (session_id = 123)
     → Data diterima
     → INSERT database (session_id = 123, relative_time = 5)
     → Broadcast WebSocket
      ↓
User: Grafik update real-time
      Timer: 00:05 (jalan)
      Status: "Recording"
      Frekuensi: "1.5 Hz"
      Data Saving: "Aktif" (hijau)

Database:
  sessions:
    - id: 123
    - frequency: 1.5
    - started_at: 2025-11-12 10:00:00
    - status: running
    
  realtime_data:
    - session_id: 123
    - laptop_id: 1
    - frequency: 1.5
    - relative_time: 5
    - timestamp: 2025-11-12 10:00:05
    
Export Realtime: ✅ Ada data (semua data sejak toggle ON)
Export Session: ✅ Ada data (hanya data dengan session_id = 123)
```

### Scenario 3: Session Tanpa Realtime (Timer Only)
```
Admin: [Mulai Data Realtime] OFF
       [Mulai Rekaman] ON

Kamera → Send data
      ↓
API: Flag check → DISABLED ❌
     → Data DITOLAK
     → Response: {"success": false, "message": "Data rejected"}
     → TIDAK ada broadcast
      ↓
User: Grafik TIDAK update (kosong)
      Timer: 00:15 (tetap jalan!)
      Status: "Recording"
      Data Saving: "Tidak Aktif" (merah)

Database:
  sessions:
    - id: 124
    - frequency: 2.5
    - started_at: 2025-11-12 10:05:00
    - status: running
    
  realtime_data:
    (KOSONG - tidak ada INSERT)
    
Export Realtime: ❌ Tidak ada data
Export Session: ❌ Tidak ada data
```

### Scenario 4: Selective Data Collection
```
Timeline:
00:00 - Admin: [Mulai Rekaman] ON → Timer start
00:05 - Admin: [Mulai Data Realtime] ON → Data mulai masuk
00:50 - Admin: [Stop Data Realtime] OFF → Data berhenti masuk
01:00 - Auto: [Stop Rekaman] → Timer stop

Result Database:
  realtime_data (session_id = 125):
    - relative_time: 5-50 (45 detik data)
    - relative_time: 0-5 dan 50-60 TIDAK ADA
    
Export Session: ✅ Hanya 45 detik data (detik 5-50)
```

## 🔧 Technical Implementation

### API: receive_camera_data.php

**Flow Chart:**
```
POST data from camera
  ↓
Validate JSON & laptop_id
  ↓
CEK FLAG (PALING AWAL!)
├─ Flag OFF → REJECT (return 200 + error message)
└─ Flag ON → CONTINUE
         ↓
    CEK SESSION (optional)
    ├─ Session active → Get session_id, frequency, relative_time
    └─ No session → session_id = NULL
         ↓
    INSERT DATABASE (pasti save kalau sampai sini)
         ↓
    BROADCAST WEBSOCKET
         ↓
    RESPONSE SUCCESS
```

**Code Logic:**
```php
// Step 1: CEK FLAG DI AWAL
$realtime_enabled = false;
if (file_exists($flag_file)) {
    $flag_data = json_decode(file_get_contents($flag_file), true);
    $realtime_enabled = $flag_data['enabled'] ?? false;
}

// Step 2: REJECT jika OFF
if (!$realtime_enabled) {
    echo json_encode([
        'success' => false,
        'message' => 'Data rejected - Realtime saving is disabled',
        'realtime_enabled' => false
    ]);
    exit; // STOP DI SINI!
}

// Step 3: PROSES data (cek session, insert, broadcast)
// Jika sampai sini berarti realtime enabled
```

### API: toggle_realtime_save.php

**Function:**
- Start: Set `temp/realtime_save_flag.json` → `{"enabled": true}`
- Stop: Set `temp/realtime_save_flag.json` → `{"enabled": false}`
- Broadcast event via WebSocket

**Response:**
```json
{
  "status": "success",
  "message": "Realtime saving started",
  "enabled": true
}
```

### Frontend: Admin Control

**Button State:**
```javascript
// Mulai Data Realtime (Blue)
isRealtimeSaving = false
Button: "Mulai Data Realtime" (Blue)

// Stop Data Realtime (Red)
isRealtimeSaving = true
Button: "Stop Data Realtime" (Red)
```

**Button Always Visible:**
- Tidak hidden saat start/stop recording
- Independen dari timer/session state

### Frontend: User Page Indicator

**Session Info Bar:**
```
Data Saving: Tidak Aktif (Red) → realtime OFF
Data Saving: Aktif (Green) → realtime ON
```

## 📁 Export Differences

### Export Realtime (All Data)
**SQL Query:**
```sql
SELECT * FROM realtime_data
WHERE timestamp BETWEEN (first realtime ON) AND (last realtime OFF)
-- Tidak peduli session_id
```

**Contains:**
- Semua data sejak "Mulai Data Realtime" ON
- Data dengan session_id (saat recording)
- Data tanpa session_id (saat free mode)
- Data dari semua frequency

### Export Session (Recording Data Only)
**SQL Query:**
```sql
SELECT * FROM realtime_data
WHERE session_id = ?
AND relative_time BETWEEN 0 AND 60
ORDER BY relative_time ASC
```

**Contains:**
- Hanya data dengan `session_id` tertentu
- Hanya data dalam 60 detik session
- Data dari 1 frequency saja (yang dipilih saat recording)
- Sorted by relative_time (0-60)

## 🎯 Use Cases

### Use Case 1: Free Mode Monitoring
**Goal:** Monitor data terus-menerus tanpa session

**Steps:**
1. Admin: [Mulai Data Realtime] ON
2. Biarkan data masuk terus
3. Export Realtime kapan saja untuk ambil data

**Result:**
- Data masuk non-stop
- Tidak ada session_id
- Grafik update real-time

### Use Case 2: Timed Recording
**Goal:** Record data dalam periode 60 detik spesifik

**Steps:**
1. Admin: [Mulai Data Realtime] ON
2. Admin: Pilih frequency 1.5 Hz
3. Admin: [Mulai Rekaman]
4. Wait 60 seconds (auto-stop)
5. Export Session untuk ambil data 60 detik ini

**Result:**
- Data punya session_id
- Data punya relative_time 0-60
- Export Session berisi 60 detik data frequency 1.5 Hz

### Use Case 3: Selective Recording
**Goal:** Hanya record data pada momen tertentu

**Steps:**
1. Admin: [Mulai Rekaman] → Timer jalan
2. Wait 10 seconds (warmup)
3. Admin: [Mulai Data Realtime] ON
4. Wait 40 seconds (collect data)
5. Admin: [Stop Data Realtime] OFF
6. Wait 10 seconds (cooldown)
7. Auto-stop recording at 60 seconds

**Result:**
- Session duration: 60 seconds
- Data collected: 40 seconds (relative_time 10-50)
- Export Session: 40 seconds data only

## ⚠️ Important Notes

### Data Flow Control
- **Realtime toggle** adalah keran utama
- Jika OFF, **tidak ada data** yang masuk (API reject langsung)
- Timer bisa jalan tanpa data masuk (scenario 3)

### Session vs Realtime
- **Session** untuk grouping data (60 detik)
- **Realtime** untuk mengontrol data flow
- Keduanya **independen** sepenuhnya

### Database Behavior
- `session_id` = NULL → data tanpa session (free mode)
- `session_id` = 123 → data dalam session 123
- `relative_time` = NULL → data di luar session
- `relative_time` = 0-60 → data dalam session

### Backward Compatibility
**BREAKING CHANGE!**
- Default behavior berubah: realtime OFF by default
- Sistem lama yang expect auto-save perlu update

## 🧪 Testing Checklist

- [ ] Toggle OFF → Kamera kirim data → API return "rejected"
- [ ] Toggle OFF → Grafik tidak update
- [ ] Toggle ON → Data masuk dan grafik update
- [ ] Recording tanpa realtime → Timer jalan tapi grafik kosong
- [ ] Realtime tanpa recording → Grafik update tapi session_id = NULL
- [ ] Recording + Realtime → Data punya session_id
- [ ] Export Realtime → Ambil semua data
- [ ] Export Session → Ambil data dengan session_id saja

## 📝 Summary

| Feature | Old Mechanism | New Mechanism |
|---------|---------------|---------------|
| **Data masuk** | Otomatis saat recording | Kontrol manual via toggle |
| **Recording** | Start data + timer | Hanya timer + session |
| **Realtime toggle** | Kontrol save only | Kontrol data flow (keran utama) |
| **Default state** | Data masuk otomatis | Data TIDAK masuk (toggle OFF) |
| **Export Realtime** | Semua data auto-saved | Data sejak toggle ON |
| **Export Session** | Data dalam session | Data dengan session_id |

**Key Point:** 
- **Realtime** = Apakah data MASUK atau TIDAK
- **Recording** = Apakah ada SESSION atau TIDAK
