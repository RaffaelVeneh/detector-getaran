# 📹 Camera Simulator with WebSocket Monitor

## Overview

Script `camera_with_monitor.py` adalah simulator kamera yang:
- ✅ Mengirim data ke API endpoint via HTTP POST
- ✅ Monitor broadcast dari WebSocket server secara real-time
- ✅ Verifikasi end-to-end: data yang dikirim sampai ke broadcast
- ✅ Menampilkan statistik lengkap dan progress bar

## Features

### 1. Realistic Data Generation
- Simulasi getaran sinusoidal dengan noise
- Frekuensi 1.5 Hz (sesuai kategori baja)
- Amplitudo random 150-200mm
- Detection flags (is_a_detected, is_b_detected)

### 2. WebSocket Monitoring
- Koneksi ke WebSocket server (ws://localhost:8080)
- Listen broadcast real-time
- Track data yang dikirim sendiri (filter by laptop_id)
- Menampilkan notifikasi saat broadcast diterima

### 3. Progress Tracking
- Progress bar visual
- Counter: Sent / Success / Broadcasts
- Real-time update setiap 0.5 detik
- Final summary dengan statistik lengkap

### 4. Session Management
- Auto start new session sebelum kirim data
- Validasi session start berhasil
- Handle session timeout (60 detik)

## Usage

### Basic Usage

```bash
# Simulate camera 1 untuk 30 detik
python camera_with_monitor.py 1 -d 30

# Simulate camera 5 untuk 60 detik dengan 2 Hz sampling
python camera_with_monitor.py 5 -d 60 -i 0.5

# Quick test 10 detik
python camera_with_monitor.py 1 -d 10 -i 1
```

### Parameters

| Parameter | Deskripsi | Default | Contoh |
|-----------|-----------|---------|--------|
| `laptop_id` | ID kamera/laptop (1-8) | **Required** | `1` |
| `-d, --duration` | Durasi recording (detik) | 60 | `-d 30` |
| `-i, --interval` | Interval kirim data (detik) | 0.5 | `-i 0.25` |
| `--api` | Base URL API | `http://localhost/detector-getaran` | `--api http://192.168.1.100/detector-getaran` |

### Examples

#### 1. Full 60-Second Recording (Default)
```bash
python camera_with_monitor.py 1
```

Output:
```
============================================================
  📹 CAMERA SIMULATOR - Laptop ID: 1
============================================================
  Duration: 60s
  Interval: 0.5s (2.0 Hz)
  API: http://localhost/detector-getaran/api/receive_camera_data.php
============================================================

  🔌 Starting WebSocket monitor...
  ✅ WebSocket connected to ws://localhost:8080
  👂 Listening for broadcasts...

  📤 Starting data transmission...

  [██████████████████████████████] t=60s | Sent: 120 | Success: 120 | Broadcasts: 120
  📡 BROADCAST RECEIVED: t=60s, distA=123.45mm, distB=167.89mm

============================================================
  📊 TRANSMISSION SUMMARY
============================================================
  Total sent:       120
  Success:          120 (100.0%)
  Failed:           0 (0.0%)
  Broadcasts heard: 120
============================================================

  📡 Broadcast Ratio: 100.0%
  ✅ EXCELLENT: Almost all data broadcasted!

  📋 Last 10 broadcasts:
     1. t=60s | distA=123.45mm | distB=167.89mm
     2. t=59s | distA=145.67mm | distB=189.12mm
     ...
============================================================
```

#### 2. Quick Test (10 seconds, 1 Hz)
```bash
python camera_with_monitor.py 1 -d 10 -i 1
```

#### 3. High-Frequency Test (30 seconds, 4 Hz)
```bash
python camera_with_monitor.py 1 -d 30 -i 0.25
```

#### 4. Multi-Camera Simulation
```bash
# Terminal 1
python camera_with_monitor.py 1 -d 60

# Terminal 2
python camera_with_monitor.py 2 -d 60

# Terminal 3
python camera_with_monitor.py 3 -d 60
```

## Output Explanation

### Progress Bar
```
[██████████████░░░░░░░░░░░░░░] t=30s | Sent: 60 | Success: 60 | Broadcasts: 58
```
- `[████...]`: Visual progress (30/60 = 50%)
- `t=30s`: Current relative time
- `Sent: 60`: Total requests sent
- `Success: 60`: Successful API responses
- `Broadcasts: 58`: WebSocket broadcasts received

### Broadcast Notifications
```
📡 BROADCAST RECEIVED: t=45s, distA=156.78mm, distB=134.56mm
```
- Real-time notification saat data Anda di-broadcast
- Menampilkan data yang di-broadcast (time, distA, distB)

### Summary Statistics

**Broadcast Ratio**: Persentase broadcasts vs successful sends
- ✅ **≥95%**: EXCELLENT - System working perfectly
- ✓ **80-94%**: GOOD - Acceptable performance
- ⚠️ **50-79%**: WARNING - Some broadcasts missing
- ❌ **<50%**: CRITICAL - Many broadcasts not received

### Recent Broadcasts List
```
📋 Last 10 broadcasts:
   1. t=60s | distA=123.45mm | distB=167.89mm
   2. t=59s | distA=145.67mm | distB=189.12mm
   ...
```
- Menampilkan 10 broadcast terakhir yang diterima
- Useful untuk verify data integrity

## Troubleshooting

### 1. WebSocket Connection Failed
**Symptoms:**
```
❌ WebSocket Error: Connection refused
```

**Solutions:**
- Pastikan WebSocket server jalan: `php websocket_server.php`
- Cek port 8080 tidak dipakai: `Test-NetConnection localhost -Port 8080`
- Restart WebSocket server

### 2. No Broadcasts Received
**Symptoms:**
```
Broadcasts heard: 0
❌ CRITICAL: Many broadcasts missing!
```

**Solutions:**
1. Cek `ws_output.log` untuk "Broadcasted to X clients"
2. Pastikan `internal_broadcast.php` dipanggil (cek `error_api.log`)
3. Verify queue file: `Get-Content temp\broadcast_queue.jsonl`
4. Restart WebSocket server

### 3. API Errors
**Symptoms:**
```
⚠️ API Error (400): Recording session has ended
```

**Solutions:**
- Session timeout setelah 60 detik (normal behavior)
- Untuk test lebih lama, kurangi frequency: `-i 1` (1 Hz)
- Atau jalankan ulang dengan session baru

### 4. Timeout Issues
**Symptoms:**
```
⏱️ Timeout at t=15s
```

**Solutions:**
- Server overloaded, kurangi frequency: `-i 1`
- Cek MySQL/Apache running normal
- Restart Laragon services

## Requirements

### Python Libraries
```bash
pip install requests websocket-client
```

### System Requirements
- ✅ Laragon running (Apache + MySQL)
- ✅ WebSocket server running: `php websocket_server.php`
- ✅ Database configured (`db_config.php`)
- ✅ Active session (script auto-start)

## Comparison with Other Simulators

| Feature | `camera_with_monitor.py` | `test_camera_api.py` | `simulate_data.py` |
|---------|-------------------------|---------------------|-------------------|
| WebSocket Monitor | ✅ Yes | ❌ No | ❌ No |
| Auto Session Start | ✅ Yes | ❌ No | ✅ Yes |
| Real-time Progress | ✅ Yes | ⚠️ Basic | ⚠️ Basic |
| Broadcast Verification | ✅ Yes | ❌ No | ❌ No |
| Multi-threaded | ✅ Yes | ❌ No | ❌ No |
| Summary Statistics | ✅ Detailed | ⚠️ Basic | ⚠️ Basic |
| **Use Case** | **End-to-end testing** | API testing | Data generation |

## Advanced Usage

### Custom API URL
```bash
# For remote server
python camera_with_monitor.py 1 --api http://192.168.1.100/detector-getaran
```

### Stress Test
```bash
# High-frequency 4 Hz for 120 seconds
python camera_with_monitor.py 1 -d 120 -i 0.25
```

### Debug Mode
```bash
# Slow test for debugging (1 Hz)
python camera_with_monitor.py 1 -d 30 -i 1
```

## Tips & Best Practices

1. **Always monitor WebSocket server output** (`ws_output.log`)
2. **Start fresh session** untuk setiap test (script auto-start)
3. **Use 0.5s interval** untuk realistic 2 Hz sampling
4. **Multi-camera test**: Run multiple terminals dengan different laptop_id
5. **Check broadcast ratio**: Aim for ≥95% untuk production

## Files Modified/Created

**New Files:**
- ✅ `camera_with_monitor.py` - Main simulator with WebSocket monitor

**Files Removed (Obsolete):**
- ❌ `simulate_data_old.py`
- ❌ `simulate_data_backup.py`
- ❌ `simulate_quick.py`
- ❌ `test_data.php`
- ❌ `test_layout.html`
- ❌ `test_websocket_connection.html`
- ❌ `test_websocket_query.php`
- ❌ `tim_1_v3_backup.html`
- ❌ `check_database.php`
- ❌ `debug_data_flow.php`
- ❌ `db_insert_opencv.php`
- ❌ `Composer-setup.php`
- ❌ `composer.phar`
- ❌ `test_deployment.bat`

**Files Kept:**
- ✅ `test_camera_api.py` - Simple API testing (no WebSocket)
- ✅ `simulate_data.py` - Database-only simulation

## Architecture Flow

```
Camera Simulator
      │
      ├─── HTTP Thread ───────────────────┐
      │    │                               │
      │    └─> POST to API                 │
      │        (receive_camera_data.php)   │
      │                │                   │
      │                └─> cURL to         │
      │                    internal_broadcast.php
      │                         │
      │                         └─> Queue File
      │                             (broadcast_queue.jsonl)
      │                                  │
      │                                  ▼
      │                         WebSocket Server
      │                         (polls queue 100ms)
      │                                  │
      ├─── WebSocket Thread ◄───────────┘
      │    (Listen broadcasts)
      │
      └─── Main Thread
           (Display stats & progress)
```

## Success Indicators

✅ **System Working Perfectly:**
```
Total sent:       120
Success:          120 (100.0%)
Failed:           0 (0.0%)
Broadcasts heard: 120
Broadcast Ratio:  100.0%
✅ EXCELLENT: Almost all data broadcasted!
```

⚠️ **Potential Issues:**
```
Broadcast Ratio: 75.5%
⚠️ WARNING: Some broadcasts missed
```
→ Check WebSocket server and queue file

❌ **Critical Issues:**
```
Broadcasts heard: 0
❌ CRITICAL: Many broadcasts missing!
```
→ WebSocket server not broadcasting (check `ws_output.log`)

## Support

Untuk issues atau questions:
1. Check `error_api.log` untuk API errors
2. Check `ws_output.log` untuk WebSocket server output
3. Check `ws_error.log` untuk WebSocket errors
4. Verify queue file: `Get-Content temp\broadcast_queue.jsonl`
5. Test WebSocket manually: Open `admin_new_v3.html` dan check browser console

---

**Created:** 2025-11-10  
**Version:** 1.0  
**Author:** System AI Assistant
