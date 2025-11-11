# CHANGELOG - Perbaikan Sistem (November 9, 2025)

## 🎯 Masalah yang Diperbaiki

### 1. ⏱️ Waktu (Detik) Tidak Bertambah & Average Tidak Update
**Root Cause:** Field `relative_time` di database kosong/null, menyebabkan label waktu chart = 0 dan perhitungan average gagal.

**Solusi:**
- `websocket_server.php`: Tambah `COALESCE` untuk menghitung `relative_time` dari `TIMESTAMPDIFF` jika null
- `tim_client_v3.js` & `admin_new_v3.js`: Validasi dan parsing `relative_time` dengan fallback ke 0
- Chart sekarang menampilkan waktu yang benar (0.0s → 60.0s)
- Average dihitung dengan durasi yang valid (fallback ke 1 detik jika 0)

### 2. ⭐ Bintang pada Grafik Gabungan (Salah - Random)
**Root Cause:** Bintang diberikan pada tim dengan displacement MAX (goyang terbesar), seharusnya pada displacement MIN (gedung paling stabil).

**Solusi:**
- `admin_new_v3.js`: Tambah logika `globalMinTeam` untuk menemukan tim dengan displacement terendah
- Label dataset: Tim MIN = "★ STABIL (X.XXmm)", Tim MAX = "| MAX: X.XXmm"
- Sekarang bintang menandai gedung yang paling tidak goyang (stabil)

### 3. 🎨 Grafik Gabungan - Opacity & Highlight
**Root Cause:** Opacity terlalu rendah (20%) membuat data susah dilihat, dan hanya tim MAX yang jelas.

**Solusi:**
- Semua dataset: opacity 50% (dari 20%)
- Tim dengan displacement MAX: opacity 100% + border tebal (highlight)
- Nilai positif & negatif tetap ditampilkan (Chart.js bar otomatis mendukung nilai < 0)
- Tooltip hover menampilkan detail lengkap

### 4. 🔄 Timer User Tidak Sinkron dengan Admin Start
**Root Cause:** WebSocket hanya broadcast data `realtime_data`, tidak ada event khusus untuk session start/stop.

**Solusi:**
- `websocket_server.php`: Tambah fungsi `checkSessionChanges()` yang polling tabel `sessions` dan broadcast event `session_started` / `session_stopped`
- `tim_client_v3.js`: Tangani event baru (`session_started`, `session_stopped`) untuk memulai/stop timer dan set frekuensi aktif
- Timer sekarang sinkron: countdown 60→0 detik dimulai bersamaan saat admin klik Start

### 5. 📊 Frekuensi Aktif Tampil Strip (-) pada User Page
**Root Cause:** Client tidak menerima informasi frekuensi saat session dimulai.

**Solusi:**
- Event `session_started` sekarang membawa field `frequency`
- `handleSessionStart()` di `tim_client_v3.js` men-set `document.getElementById('currentFrequency')` ke nilai frekuensi (mis. "1.5 Hz")
- Reset ke "-" saat session berhenti

### 6. 🟢 Titik Hijau "Connected" Menghilang
**Root Cause:** HTML span tidak diberi class status (`.status-dot.connected`), hanya parent yang diberi class.

**Solusi:**
- `tim_client_v3.js` & `admin_new_v3.js`: Perbaiki innerHTML untuk menyertakan class pada `<span class="status-dot connected">`
- CSS `.status-dot.connected` sekarang aktif dan menampilkan titik hijau beranimasi pulse
- Semua status (connecting, connected, disconnected, error) sekarang tampil dengan dot berwarna

## 📋 File yang Diubah

1. **websocket_server.php**
   - Tambah `COALESCE` untuk `relative_time` di query `checkNewData()`
   - Tambah fungsi `checkSessionChanges()` untuk broadcast session events
   - Validasi `relative_time` tidak null sebelum broadcast

2. **tim_client_v3.js**
   - Handle event `session_started` dan `session_stopped` dari WebSocket
   - Perbaiki logika timer sinkronisasi (countdown 60→0)
   - Set dan reset `currentFrequency` sesuai session
   - Perbaiki parsing `relative_time` dan validasi dengan fallback
   - Perbaiki innerHTML status koneksi dengan class pada span
   - Chart maxDataPoints dinaikkan ke 600 (capture 60s @ 10Hz)

3. **admin_new_v3.js**
   - Tambah logika `globalMinTeam` untuk bintang pada tim stabil
   - Ubah opacity default dari 20% → 50%
   - Label dataset dengan info MIN (★) dan MAX
   - Perbaiki parsing `relative_time` dengan fallback
   - Perbaiki innerHTML status koneksi dengan class pada span
   - Generate fallback timeLabels jika maxTime = 0

4. **test_deployment.bat**
   - Update untuk test SEMUA 8 tim (bukan hanya laptop 1)
   - Generate 10 data point per tim = 80 total
   - Frequency 1.5 Hz (frekuensi pertama)
   - Tampilkan link ke semua page tim (tim_1 - tim_8)

## ✅ Hasil Akhir

### Admin Panel (admin_new_v3.html)
- ✅ Grafik overlay menampilkan 8 tim dengan opacity 50%
- ✅ Tim dengan displacement terendah diberi label "★ STABIL"
- ✅ Tim dengan displacement tertinggi diberi opacity 100% + label "| MAX"
- ✅ Waktu chart bertambah dari 0.0 → 60.0 detik
- ✅ Titik hijau "Connected" tampil saat WebSocket terhubung

### User Pages (tim_1_v3.html - tim_8_v3.html)
- ✅ Timer countdown 60→0 sinkron dengan admin start
- ✅ Frekuensi aktif menampilkan angka (mis. "1.5 Hz") saat recording
- ✅ Waktu chart bertambah dengan benar
- ✅ Average (mm/s) dihitung dengan durasi yang valid
- ✅ Titik hijau "Connected" tampil saat WebSocket terhubung

### WebSocket Server
- ✅ Broadcast `relative_time` yang valid (dihitung dari TIMESTAMPDIFF)
- ✅ Broadcast event `session_started` saat admin klik Start
- ✅ Broadcast event `session_stopped` saat admin klik Stop
- ✅ Polling session changes setiap 100ms

## 🚀 Testing

### Pre-requisites
1. Laragon running (Apache + MySQL)
2. Database `db_detector_getaran` sudah ada dengan tabel `sessions`, `realtime_data`, `teams`
3. WebSocket server berjalan: `php websocket_server.php`

### Test Steps
1. Jalankan `test_deployment.bat` untuk inject dummy data (80 data points)
2. Buka admin panel: `http://localhost/detector-getaran/admin_new_v3.html`
3. Buka 2-3 page tim: `http://localhost/detector-getaran/tim_1_v3.html`
4. Di admin: pilih frequency 1.5 Hz → klik Start
5. Verifikasi:
   - ✅ Timer admin & user countdown dari 60→0 (sinkron)
   - ✅ User page: "Frekuensi Aktif" = "1.5 Hz"
   - ✅ Admin grafik: tim dengan displacement MIN ada bintang
   - ✅ Admin grafik: tim dengan displacement MAX terang (opacity 100%)
   - ✅ Waktu chart bertambah (lihat label X-axis)
   - ✅ Average (mm/s) bertambah/berubah sesuai data
   - ✅ Titik hijau "Connected" tampil di semua page

## 📝 Catatan Penting

1. **Database Password**: Pastikan `db_config.php` sesuai dengan setup MySQL Anda
2. **Port**: WebSocket server di port 8080 (pastikan tidak bentrok)
3. **Browser**: Gunakan browser modern (Chrome/Firefox) yang support WebSocket
4. **Console**: Buka DevTools Console untuk melihat log event WebSocket
5. **Session**: Hanya 1 session yang bisa running. Stop dulu sebelum start baru.

## 🔧 Troubleshooting

**Timer tidak sinkron?**
- Cek apakah WebSocket server running (`php websocket_server.php`)
- Lihat console browser: harus ada log "Session started event received"
- Cek server console: harus ada "Broadcasted session_started"

**Waktu masih 0.0 detik?**
- Cek apakah session sudah di-start dari admin
- Pastikan data di `realtime_data` punya `session_id` yang valid
- Periksa query SQL: `SELECT relative_time FROM realtime_data WHERE session_id = X`

**Frekuensi masih strip "-"?**
- Pastikan admin sudah klik Start (bukan hanya select frequency)
- Cek console browser: event `session_started` harus diterima
- Verifikasi `currentFrequency` di console: `console.log(currentFrequency)`

**Titik hijau tidak muncul?**
- Refresh page (Ctrl+F5)
- Cek CSS: `.status-dot.connected` harus ada warna hijau
- Verifikasi WebSocket status di Network tab browser

---

## 🔄 UPDATE v3.2 (November 10, 2025)

### Perubahan Grafik & Visualisasi

**Masalah Sebelumnya:**
- Grafik hanya menampilkan nilai positif (semua data di-abs)
- Pattern naik-turun (oscillation) tidak terlihat jelas
- User tidak bisa membedakan arah getaran (naik vs turun)

**Solusi Baru:**
1. **Grafik menampilkan data asli (positif-negatif)**
   - Nilai positif (+): Gedung bergerak ke ATAS → Warna BIRU
   - Nilai negatif (-): Gedung bergerak ke BAWAH → Warna MERAH
   - Pattern gelombang naik-turun sekarang jelas terlihat

2. **Y-axis (Displacement): -500 sampai +500 mm**
   - Ticks: -500, -400, -300, -200, -100, 0, 100, 200, 300, 400, 500
   - Step: 100mm
   - Gelombang melewati garis 0 (sumbu tengah)

3. **X-axis (Waktu): 0 sampai 60 detik**
   - Ticks: 0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60
   - Step: 5 detik
   - Label: "Xs" (contoh: "15s", "30s")

4. **Tooltip Custom (User Pages)**
   - Saat hover: Menampilkan waktu + displacement dengan tanda +/-
   - Format: 
     ```
     Waktu: 23.5s
     Displacement: +8.50 mm (atau -8.50 mm)
     ```

5. **Tooltip Admin (Tidak Diubah)**
   - Tetap menampilkan label tim + bintang MIN + MAX
   - Format tetap: `Tim 2 ★ STABIL: +3.20 mm`

6. **Statistik (Max, Average, Realtime)**
   - Tetap menggunakan `Math.abs()` (nilai absolut positif)
   - Alasan: Statistik menunjukkan MAGNITUDE getaran (bukan arah)
   - Konsisten untuk semua: Max = 15mm, Avg = 8mm, Realtime = 5mm

### File yang Diubah:

**1. tim_client_v3.js**
- Chart Y-axis: -500 to 500 (step 100)
- Chart X-axis: 0 to 60 (step 5)
- Data grafik: TIDAK di-abs (bisa negatif)
- Warna: Biru (≥0), Merah (<0)
- Tooltip: Custom dengan waktu detik
- Statistik: Tetap pakai abs()

**2. admin_new_v3.js**
- Chart Y-axis: -500 to 500 (step 100)
- Chart X-axis: 0 to 60 (step 5)
- Data grafik: TIDAK di-abs (bisa negatif)
- Warna: Biru/Merah per nilai + opacity (50% non-max, 100% max)
- Tooltip: Tidak diubah (tetap ada label tim)
- Label bintang: Tidak diubah (★ untuk MIN)

**3. db_insert_opencv.php**
- Tidak diubah (sudah benar - simpan data asli tanpa abs)

### Visual Preview:

**User Page:**
```
Displacement (mm)
+500 │
+300 │    █ (biru)
+100 │  █ █        █
   0 ├──█─█────█───█────> Waktu (s)
-100 │    █ (merah)
-300 │      █
-500 │
     0   5   10  15  ...  60

Stats (tetap positif):
Realtime: 8.5 mm
Max: 15.2 mm
Average: 6.8 mm/s
```

**Admin Page:**
```
8 tim overlay
(warna biru/merah + opacity)
Opacity 50% (non-max)
Opacity 100% (max)
Label bintang: ★ STABIL
```

---

**Author:** GitHub Copilot  
**Date:** November 10, 2025  
**Version:** v3.2 (Grafik Positif-Negatif + Warna)
