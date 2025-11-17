# Realtime Data Saving Control Feature

## Overview
Fitur baru yang memungkinkan admin mengontrol kapan data dari kamera/sensor disimpan ke database. Data tetap diterima dan ditampilkan di grafik real-time, tetapi hanya disimpan ke database (untuk export CSV) ketika admin mengaktifkan "Mulai Data Realtime".

## Alur Kerja

### 1. Session Recording (seperti biasa)
- Admin klik "**Mulai Rekaman**" → Session dimulai, timer berjalan, frequency aktif
- Data mulai masuk dari kamera dan **ditampilkan di grafik** (admin & user)
- **Data TIDAK disimpan ke database** secara otomatis

### 2. Start Realtime Saving (kontrol admin)
- Admin klik "**Mulai Data Realtime**" → Button berubah merah "Stop Data Realtime"
- Flag disimpan di file: `temp/realtime_save_flag.json` → `{"enabled": true}`
- API `receive_camera_data.php` mulai **INSERT data ke database**
- Broadcast event `realtime_saving_started` via WebSocket
- Indicator di user page: **"Data Saving: Aktif"** (hijau)

### 3. Stop Realtime Saving (kontrol admin)
- Admin klik "**Stop Data Realtime**" → Button kembali biru "Mulai Data Realtime"
- Flag diupdate: `{"enabled": false}`
- API `receive_camera_data.php` berhenti INSERT (data tetap diterima untuk grafik)
- Broadcast event `realtime_saving_stopped` via WebSocket
- Indicator di user page: **"Data Saving: Tidak Aktif"** (merah)

### 4. Stop Recording
- Admin klik "**Stop Rekaman**" → Session selesai
- Jika realtime saving masih aktif, otomatis di-stop
- Button "Mulai/Stop Data Realtime" disembunyikan

## Files Modified

### 1. Frontend - Admin
**admin_new_v3.html**
- Tambah button: `id="toggleRealtimeSaveBtn"` (hidden by default)
- Button muncul saat recording dimulai, hidden saat stop

**admin_new_v3.js**
- Variable: `isRealtimeSaving = false`
- Function: `toggleRealtimeSaving()` → Call API + broadcast
- Event listener: Button click handler
- Auto-hide button dan reset state saat stop recording

### 2. Frontend - User Pages
**tim_1_v3.html sampai tim_8_v3.html**
- Tambah indicator di session info bar:
  ```html
  <div class="session-info-item">
      <label>Data Saving:</label>
      <span id="realtimeSavingStatus">Tidak Aktif</span>
  </div>
  ```

**tim_client_v3.js**
- Handle event: `realtime_saving_started` dan `realtime_saving_stopped`
- Function: `updateRealtimeSavingIndicator(isActive)`
  - Green "Aktif" saat saving ON
  - Red "Tidak Aktif" saat saving OFF

### 3. Backend - API
**api/toggle_realtime_save.php** (NEW)
- POST endpoint untuk start/stop realtime saving
- Body: `{"action": "start|stop", "session_id": 123}`
- Simpan flag di: `temp/realtime_save_flag.json`
- Response: `{"status": "success", "enabled": true/false}`

**api/receive_camera_data.php** (MODIFIED)
- Cek flag sebelum INSERT:
  ```php
  $flag_file = __DIR__ . '/../temp/realtime_save_flag.json';
  $save_to_database = true; // Default: save (backward compatible)
  
  if (file_exists($flag_file)) {
      $flag_data = json_decode(file_get_contents($flag_file), true);
      if ($flag_data && isset($flag_data['enabled'])) {
          $save_to_database = $flag_data['enabled'];
      }
  }
  
  if ($save_to_database) {
      // INSERT ke realtime_data table
  } else {
      // Skip INSERT, hanya broadcast ke WebSocket
  }
  ```
- Response include: `"saved_to_database": true/false`

### 4. WebSocket
**websocket_server.php**
- Tidak perlu modifikasi khusus
- Broadcast handler sudah support event `realtime_saving_started` dan `realtime_saving_stopped`

## Data Flow

### Normal Recording (WITHOUT Realtime Save)
```
Camera → API receive_camera_data.php
         ├─ Cek flag: enabled = false
         ├─ Skip INSERT to database
         └─ Broadcast to WebSocket → Display in graphs

Result: Data visible in real-time, NOT saved to CSV
```

### Recording WITH Realtime Save
```
Camera → API receive_camera_data.php
         ├─ Cek flag: enabled = true
         ├─ INSERT to realtime_data table ✅
         └─ Broadcast to WebSocket → Display in graphs

Result: Data visible in real-time AND saved to CSV
```

## UI Screenshots (Expected)

### Admin Page
**Before Start Recording:**
```
[Mulai Rekaman]  [Freeze All Data]  [Clear All Data]
```

**During Recording (Realtime Save OFF):**
```
[Stop Rekaman]  [Mulai Data Realtime]  [Freeze All Data]  [Clear All Data]
                  (Blue button)
```

**During Recording (Realtime Save ON):**
```
[Stop Rekaman]  [Stop Data Realtime]  [Freeze All Data]  [Clear All Data]
                  (Red button)
```

### User Page Session Info Bar
**Realtime Save OFF:**
```
Kategori: Baja | Frekuensi Aktif: 1.5 Hz | Status: Recording | Timer: 00:15 | Data Saving: Tidak Aktif (red)
```

**Realtime Save ON:**
```
Kategori: Baja | Frekuensi Aktif: 1.5 Hz | Status: Recording | Timer: 00:15 | Data Saving: Aktif (green)
```

## Testing Checklist

### Admin Side
- [ ] Button "Mulai Data Realtime" muncul setelah klik "Mulai Rekaman"
- [ ] Button berubah menjadi "Stop Data Realtime" (merah) saat diklik
- [ ] Button kembali "Mulai Data Realtime" (biru) saat diklik lagi
- [ ] Button disembunyikan saat klik "Stop Rekaman"
- [ ] Console log: "✅ Broadcasted realtime_saving_started/stopped"

### User Side
- [ ] Indicator "Data Saving: Tidak Aktif" (red) by default
- [ ] Indicator berubah "Aktif" (green) saat admin start
- [ ] Indicator kembali "Tidak Aktif" (red) saat admin stop
- [ ] Console log: "💾 Realtime saving STARTED/STOPPED by admin"

### Backend API
- [ ] File `temp/realtime_save_flag.json` dibuat dengan correct data
- [ ] Flag `enabled` berubah true/false sesuai toggle
- [ ] Data masuk ke database hanya saat flag = true
- [ ] Response API include `"saved_to_database": true/false`

### Export CSV
- [ ] Export hanya berisi data yang disimpan (saat flag aktif)
- [ ] Data yang tidak disimpan (flag OFF) tidak muncul di CSV

## Use Cases

### Use Case 1: Calibration Phase
**Scenario:** Admin ingin test sistem tanpa menyimpan data ke database (calibration/warmup)
1. Admin klik "Mulai Rekaman" → Session start, frequency aktif
2. Data masuk dan ditampilkan di grafik (admin + user melihat)
3. Admin TIDAK klik "Mulai Data Realtime"
4. Data hanya untuk visualisasi, tidak disimpan
5. Admin klik "Stop Rekaman" → Session selesai, database kosong

### Use Case 2: Data Collection Phase
**Scenario:** Admin sudah siap untuk collect data yang valid
1. Admin klik "Mulai Rekaman" → Session start
2. Admin klik "Mulai Data Realtime" → Database saving ON
3. Data masuk, ditampilkan DAN disimpan
4. Admin klik "Stop Data Realtime" → Database saving OFF
5. Data selanjutnya hanya ditampilkan, tidak disimpan
6. Admin klik "Stop Rekaman" → Session selesai

### Use Case 3: Selective Saving
**Scenario:** Admin ingin save hanya pada periode tertentu
1. Admin klik "Mulai Rekaman" (frekuensi 1.5 Hz)
2. Detik 0-10: Warmup → TIDAK save (toggle OFF)
3. Detik 10-50: Valid data → SAVE (toggle ON)
4. Detik 50-60: Cooldown → TIDAK save (toggle OFF)
5. Result: CSV hanya berisi data detik 10-50

## Backward Compatibility

**Default Behavior:** Data tetap disimpan jika flag file tidak ada
```php
$save_to_database = true; // Default: save (backward compatible)
```

Ini memastikan sistem lama tetap berfungsi tanpa perlu modifikasi.

## API Endpoint Reference

### POST /api/toggle_realtime_save.php
**Request:**
```json
{
  "action": "start",
  "session_id": 123
}
```

**Response (Success):**
```json
{
  "status": "success",
  "message": "Realtime saving started",
  "session_id": 123,
  "enabled": true
}
```

### POST /api/receive_camera_data.php
**Response (Modified):**
```json
{
  "success": true,
  "message": "Data received and stored",
  "saved_to_database": true,
  "mode": "recording",
  "data": { ... }
}
```

Or when saving disabled:
```json
{
  "success": true,
  "message": "Data received (not saved - realtime saving disabled)",
  "saved_to_database": false,
  "mode": "recording",
  "data": { ... }
}
```

## Troubleshooting

### Issue: Button tidak muncul
**Check:**
- Apakah sudah klik "Mulai Rekaman"?
- Browser console: ada error JavaScript?
- File admin_new_v3.html sudah terupdate?

### Issue: Indicator tidak berubah di user page
**Check:**
- WebSocket connected?
- Console log: ada event `realtime_saving_started`?
- File tim_X_v3.html sudah punya `<span id="realtimeSavingStatus">`?

### Issue: Data tetap masuk ke database padahal toggle OFF
**Check:**
- File `temp/realtime_save_flag.json` ada dan berisi `{"enabled": false}`?
- API `receive_camera_data.php` sudah diupdate dengan checking code?
- Restart PHP server jika perlu

## Deployment Notes

1. **Ensure temp directory exists:**
   ```bash
   mkdir -p temp
   chmod 755 temp
   ```

2. **Clear existing flag (optional):**
   ```bash
   rm temp/realtime_save_flag.json
   ```

3. **Restart WebSocket server:**
   ```bash
   # Stop current server (Ctrl+C)
   php websocket_server.php
   ```

4. **Clear browser cache:**
   - Refresh admin dan user pages dengan Ctrl+F5

## Summary

✅ **Admin kontrol penuh** kapan data disimpan ke database
✅ **Real-time visualization tetap jalan** tanpa saving
✅ **Export CSV hanya berisi data yang disimpan**
✅ **User visibility** apakah data sedang disimpan (indicator)
✅ **Backward compatible** dengan sistem lama

Fitur ini memberikan fleksibilitas untuk:
- Calibration phase tanpa polusi data
- Selective data collection
- Test sistem tanpa mengisi database
- Better control over CSV export content
