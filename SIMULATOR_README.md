# Data Simulator untuk Detector Getaran

Script Python untuk mensimulasikan data dari semua tim (16 tim: 8 Baja + 8 Beton) yang masuk ke WebSocket server.

## Requirements

Install library yang dibutuhkan:

```powershell
pip install websockets
```

## Cara Penggunaan

### 1. Start WebSocket Server

Pertama, jalankan WebSocket server:

```powershell
php websocket_server.php
```

Server akan berjalan di `ws://localhost:8080`

### 2. Jalankan Simulator

#### Opsi A: Interactive Mode (dengan menu)

```powershell
python simulate_data.py
```

Akan muncul menu untuk memilih:
- Category (Baja/Beton)
- Frekuensi (1.5, 2.5, 3.5, 4.5, 5.5 Hz)
- Interval pengiriman data

#### Opsi B: Quick Mode (langsung run)

```powershell
# Default: Baja, 1.5 Hz
python simulate_quick.py

# Beton, 2.5 Hz
python simulate_quick.py beton 2.5

# Baja, 3.5 Hz
python simulate_quick.py baja 3.5
```

### 3. Buka Web Interface

Buka browser dan akses:

**Admin Page:**
```
http://localhost/detector-getaran/admin_new_v3.html
```

**User Pages (pilih salah satu):**
```
http://localhost/detector-getaran/tim_1_v3.html
http://localhost/detector-getaran/tim_2_v3.html
...
http://localhost/detector-getaran/tim_8_v3.html
```

## Fitur Simulator

✅ **Simulasi 8 Tim Sekaligus**
- Setiap category (Baja/Beton) punya 8 tim
- Data dikirim bersamaan untuk semua tim

✅ **Data Realistis**
- Displacement A (Lantai 3): -500 hingga 500 mm
- Displacement B (Lantai 10): -500 hingga 500 mm
- Amplitudo berbeda untuk setiap tim
- Decay effect (amplitudo menurun seiring waktu)

✅ **Timer Synchronization**
- Relative time naik dari 0 hingga 60 detik
- Session ID unique untuk setiap recording
- Timestamp real-time

✅ **WebSocket Protocol**
- Message type: `session_started`, `new_data`, `session_stopped`
- Format data sama dengan production
- Support multiple frequencies

## Data Format

Setiap data point yang dikirim:

```json
{
  "type": "new_data",
  "data": [
    {
      "laptop_id": 1,
      "category": "baja",
      "nama_tim": "Institut Teknologi Nasional Malang_TRISHA ABINAWA",
      "dista": 123.45,
      "distb": -67.89,
      "frequency": 1.5,
      "session_id": 1699999999,
      "relative_time": 5.50,
      "timestamp": "2025-11-10T12:34:56.789"
    },
    // ... 7 tim lainnya
  ]
}
```

## Troubleshooting

### "Connection refused"
- Pastikan WebSocket server sudah running (`php websocket_server.php`)
- Check port 8080 tidak dipakai aplikasi lain

### "No module named 'websockets'"
```powershell
pip install websockets
```

### Data tidak muncul di web
- Clear browser cache (Ctrl + Shift + R)
- Check browser console (F12) untuk error
- Pastikan category di admin match dengan simulator

### Timer tidak jalan
- Sudah diperbaiki di `tim_client_v3.js`
- Pastikan menggunakan versi terbaru

## Testing Scenarios

### Test 1: Single Category
1. Run simulator dengan Baja 1.5 Hz
2. Buka admin page, pastikan category = Baja, freq = 1.5 Hz
3. Buka tim_1_v3.html
4. Verify: Timer jalan, grafik update real-time

### Test 2: Category Switch
1. Run simulator Baja 2.5 Hz (tunggu selesai)
2. Run simulator Beton 2.5 Hz
3. Verify: Data tidak tercampur, nama tim berubah

### Test 3: Multiple Frequencies
1. Run simulator freq 1.5 Hz (tunggu selesai)
2. Run simulator freq 3.5 Hz (tunggu selesai)
3. Verify: Grafik berbeda untuk tiap frekuensi

### Test 4: All Teams Overlay (Admin)
1. Run simulator
2. Buka admin page
3. Verify: 8 garis muncul di grafik overlay
4. Verify: Legend menampilkan 8 nama tim
5. Verify: Garis putus-putus di Y=0 terlihat

## Notes

- Simulator otomatis stop setelah 60 detik
- Press `Ctrl+C` untuk stop lebih awal
- Data interval default: 0.5 detik (2 data/second)
- Maksimum displacement: ±500 mm
