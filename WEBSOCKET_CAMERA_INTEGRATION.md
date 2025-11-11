# WebSocket Camera Integration - Complete Guide

## Overview
Script `opencv_camera_sender_ws.py` memungkinkan kamera OpenCV mengirim data **langsung via WebSocket** ke server, lalu server akan broadcast ke semua client (admin page & user pages).

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CAMERA (OpenCV)                                                         │
│ - Deteksi gerakan/displacement                                         │
│ - Menghasilkan 5 fields:                                               │
│   1. laptop_id (1-8)                                                   │
│   2. dista (float, mm)                                                 │
│   3. distb (float, mm)                                                 │
│   4. is_a_detected (bool)                                              │
│   5. is_b_detected (bool)                                              │
└────────────────────┬────────────────────────────────────────────────────┘
                     │
                     │ WebSocket Connection
                     │ ws://localhost:8080
                     ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ WEBSOCKET SERVER (websocket_server.php)                                │
│ - Terima message type: "camera_data"                                   │
│ - Enrich dengan 6 fields tambahan:                                     │
│   6. session_id (dari DB)                                              │
│   7. category ('baja' or 'beton')                                      │
│   8. frequency (1.5, 2.5, 3.5, 4.5, 5.5 Hz)                           │
│   9. relative_time (0-60 detik)                                        │
│  10. elapsed_seconds (timer sesi)                                      │
│  11. timestamp (waktu server)                                          │
│ - Insert ke database                                                   │
│ - Broadcast ke semua connected clients                                 │
└────────────────────┬────────────────────────────────────────────────────┘
                     │
                     │ Broadcast (11 fields)
                     │
        ┌────────────┴────────────┐
        ↓                         ↓
┌──────────────────┐    ┌──────────────────┐
│ ADMIN PAGE       │    │ USER PAGES       │
│ admin_new_v3.html│    │ tim_1_v3.html    │
│                  │    │ tim_2_v3.html    │
│ - Lihat 8 tim    │    │ ...              │
│ - Statistik      │    │ tim_8_v3.html    │
│ - Export         │    │                  │
│                  │    │ - Grafik realtime│
│                  │    │ - Timer          │
└──────────────────┘    └──────────────────┘
```

## Data Structure

### Input dari Kamera (5 fields)
```python
{
    "type": "camera_data",
    "laptop_id": 1,
    "dista": 5.234,
    "distb": 3.456,
    "is_a_detected": True,
    "is_b_detected": True
}
```

### Output ke Client (11 fields)
```json
{
    "type": "new_data",
    "laptop_id": 1,
    "dista": 5.234,
    "distb": 3.456,
    "is_a_detected": true,
    "is_b_detected": true,
    "session_id": 42,
    "category": "baja",
    "frequency": 1.5,
    "relative_time": 15,
    "elapsed_seconds": 15,
    "timestamp": "2025-11-10 14:30:45"
}
```

## Implementation in OpenCV Code

### Method 1: Context Manager (Recommended)
```python
from opencv_camera_sender_ws import CameraSenderWS

# Setup
sender = CameraSenderWS(laptop_id=1)  # 1-8 sesuai tim

# Main loop
with sender:
    while True:
        # 1. CAPTURE FRAME
        ret, frame = cap.read()
        if not ret:
            break
        
        # 2. PROCESS FRAME (deteksi displacement)
        dista, distb, is_a_detected, is_b_detected = your_detection_function(frame)
        
        # 3. SEND VIA WEBSOCKET
        sender.send(
            dista=dista,
            distb=distb,
            is_a_detected=is_a_detected,
            is_b_detected=is_b_detected
        )
        
        # 4. DISPLAY (optional)
        cv2.imshow('Camera', frame)
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

# Auto disconnect ketika keluar from 'with' block
```

### Method 2: Manual Connection
```python
from opencv_camera_sender_ws import CameraSenderWS

sender = CameraSenderWS(laptop_id=1)

# Connect
if not sender.connect():
    print("Failed to connect!")
    exit(1)

try:
    while True:
        # Capture & process
        ret, frame = cap.read()
        dista, distb, det_a, det_b = process_frame(frame)
        
        # Send
        success = sender.send(dista, distb, det_a, det_b)
        
        if not success:
            print("Send failed, reconnecting...")
            sender.disconnect()
            time.sleep(1)
            sender.connect()
        
        time.sleep(0.1)  # 10 Hz

finally:
    sender.disconnect()
```

### Method 3: Minimal Example
```python
from opencv_camera_sender_ws import CameraSenderWS
import time

sender = CameraSenderWS(laptop_id=1)

if sender.connect():
    for i in range(100):
        sender.send(
            dista=5.0 + i * 0.1,
            distb=3.0 - i * 0.05,
            is_a_detected=True,
            is_b_detected=(i % 2 == 0)
        )
        time.sleep(0.5)  # 2 Hz
    
    sender.disconnect()
```

## Complete Integration Example

```python
import cv2
import numpy as np
from opencv_camera_sender_ws import CameraSenderWS

# Configuration
LAPTOP_ID = 1  # Ganti sesuai tim (1-8)
CAMERA_INDEX = 0

# Initialize camera
cap = cv2.VideoCapture(CAMERA_INDEX)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
cap.set(cv2.CAP_PROP_FPS, 30)

# Initialize WebSocket sender
sender = CameraSenderWS(laptop_id=LAPTOP_ID)

print("="*70)
print("  OpenCV Vibration Detector - WebSocket Version")
print("="*70)
print(f"  Laptop ID: {LAPTOP_ID}")
print(f"  WebSocket: {sender.ws_url}")
print("="*70)
print()

# Connect to WebSocket
if not sender.connect():
    print("ERROR: Tidak bisa connect ke WebSocket server!")
    print("Pastikan websocket_server.php sudah running:")
    print("  php websocket_server.php")
    cap.release()
    exit(1)

print("✓ Connected to WebSocket server")
print("✓ Press 'q' to quit")
print()

try:
    frame_count = 0
    
    while True:
        # Capture frame
        ret, frame = cap.read()
        if not ret:
            print("ERROR: Tidak bisa baca frame dari kamera")
            break
        
        frame_count += 1
        
        # ================================================================
        # TODO: GANTI DENGAN ALGORITMA DETEKSI ANDA
        # ================================================================
        # Contoh sederhana: deteksi edge dan hitung displacement
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        
        # Simulasi displacement (ganti dengan algoritma asli Anda)
        # Misalnya: optical flow, template matching, dll
        dista = np.mean(edges[:240, :]) / 10  # Top half -> Building A
        distb = np.mean(edges[240:, :]) / 10  # Bottom half -> Building B
        
        is_a_detected = dista > 1.0
        is_b_detected = distb > 1.0
        # ================================================================
        
        # Send ke server via WebSocket
        success = sender.send(
            dista=dista,
            distb=distb,
            is_a_detected=is_a_detected,
            is_b_detected=is_b_detected
        )
        
        # Display info on frame
        cv2.putText(frame, f"Laptop ID: {LAPTOP_ID}", (10, 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
        cv2.putText(frame, f"Dist A: {dista:.2f}mm {'[OK]' if is_a_detected else '[--]'}", 
                    (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        cv2.putText(frame, f"Dist B: {distb:.2f}mm {'[OK]' if is_b_detected else '[--]'}", 
                    (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
        cv2.putText(frame, f"WS: {'Connected' if success else 'Disconnected'}", 
                    (10, 120), cv2.FONT_HERSHEY_SIMPLEX, 0.6, 
                    (0, 255, 0) if success else (0, 0, 255), 2)
        
        # Show frame
        cv2.imshow('Vibration Detector', frame)
        
        # Check quit
        if cv2.waitKey(1) & 0xFF == ord('q'):
            print("\nQuitting...")
            break
        
        # Reconnect jika koneksi putus
        if not success and frame_count % 30 == 0:
            print("Reconnecting to WebSocket...")
            sender.disconnect()
            time.sleep(0.5)
            sender.connect()

except KeyboardInterrupt:
    print("\n\nStopped by user (Ctrl+C)")

finally:
    # Cleanup
    stats = sender.get_stats()
    print()
    print("="*70)
    print("  Session Statistics")
    print("="*70)
    print(f"  Total sent: {stats['total']}")
    print(f"  Success: {stats['success']} ({stats['success_rate']:.1f}%)")
    print(f"  Failed: {stats['failed']}")
    print("="*70)
    
    sender.disconnect()
    cap.release()
    cv2.destroyAllWindows()
    
    print("\n✓ Camera closed, WebSocket disconnected")
```

## Testing & Verification

### 1. Start WebSocket Server
```powershell
cd C:\laragon\www\detector-getaran
php websocket_server.php
```

Output yang diharapkan:
```
WebSocket Server initialized
Server started on port 8080
Listening for connections...
```

### 2. Start Session (Admin/API)
```powershell
curl http://localhost/detector-getaran/start_new_session.php
```

Atau buka admin page dan klik tombol start.

### 3. Test Python Script
```powershell
python opencv_camera_sender_ws.py
```

Output yang diharapkan:
```
======================================================================
  OpenCV Camera Sender - WebSocket Version
======================================================================
  Flow:
  1. Kamera OpenCV → 5 fields (laptop_id, dista, distb, detect A/B)
  2. WebSocket → Server (port 8080)
  3. Server → Tambah fields (frequency, timestamp, dll)
  4. Server → Broadcast ke Admin & User pages
======================================================================

Method 1: Using context manager (recommended)
----------------------------------------------------------------------
Connecting to WebSocket: ws://localhost:8080...
✓ Connected to WebSocket server
Laptop ID: 1
WebSocket: ws://localhost:8080

Mengirim 5 data test...
✓ Data 1 terkirim | distA=100.5mm, distB=200.3mm
✓ Data 2 terkirim | distA=110.5mm, distB=195.3mm
✓ Data 3 terkirim | distA=120.5mm, distB=190.3mm
✓ Data 4 terkirim | distA=130.5mm, distB=185.3mm
✓ Data 5 terkirim | distA=140.5mm, distB=180.3mm

======================================================================
  Statistik Pengiriman
======================================================================
  Total: 5
  Sukses: 5 (100.0%)
  Gagal: 0
  Status: Connected
======================================================================
✓ WebSocket connection closed
```

### 4. Check Server Logs
Di terminal WebSocket server:
```
Received camera_data from laptop_id: 1
✓ Data saved to DB (session_id: 42, laptop_id: 1)
Broadcasted enriched data to 2 clients
Received camera_data from laptop_id: 1
✓ Data saved to DB (session_id: 42, laptop_id: 1)
Broadcasted enriched data to 2 clients
...
```

### 5. Check Web Pages
**Admin Page** (`admin_new_v3.html`):
- Row "Tim A-1" (atau B-1 jika beton) akan update real-time
- Statistik akan update

**User Page** (`tim_1_v3.html`):
- Grafik akan update real-time
- Timer akan berjalan
- Angka displacement akan update

### 6. Check Database
```sql
SELECT * FROM measurements ORDER BY id DESC LIMIT 10;
```

Harus ada data baru dengan:
- `laptop_id` = 1
- `dista`, `distb` sesuai yang dikirim
- `is_a_detected`, `is_b_detected` sesuai
- `session_id` sesuai sesi aktif

## Troubleshooting

### Problem: "Connection refused"
```
✗ WebSocket connection error: Connection refused
```

**Solution:**
- Pastikan WebSocket server running: `php websocket_server.php`
- Cek port 8080 tidak dipakai aplikasi lain
- Pastikan firewall tidak block port 8080

### Problem: "Not connected. Call connect() first!"
```python
# Lupa connect
sender = CameraSenderWS(laptop_id=1)
sender.send(...)  # ✗ Error!

# Harus connect dulu
sender.connect()
sender.send(...)  # ✓ OK
```

**Solution:** Gunakan context manager (`with`) untuk auto-connect.

### Problem: Data tidak muncul di web
**Check list:**
1. WebSocket server running? ✓
2. Session sudah start? ✓ (curl start_new_session.php)
3. Camera script connected? ✓ (cek "Connected to WebSocket server")
4. Web page connect? ✓ (buka browser console, cek WebSocket status)

**Debug:**
```javascript
// Di browser console (admin/user page)
ws.readyState  // 1 = OPEN, 0 = CONNECTING, 3 = CLOSED
```

### Problem: "Warning: Tidak ada session aktif"
Di server logs:
```
Warning: Tidak ada session aktif
```

**Solution:** Start session dulu:
```powershell
curl http://localhost/detector-getaran/start_new_session.php
```

## Advantages vs HTTP Version

| Feature | HTTP (`opencv_camera_sender.py`) | WebSocket (`opencv_camera_sender_ws.py`) |
|---------|----------------------------------|------------------------------------------|
| **Connection** | Request per data point | Persistent connection |
| **Latency** | ~50-100ms | ~1-5ms |
| **Server Load** | High (create connection tiap kali) | Low (reuse connection) |
| **Real-time** | Good | Excellent |
| **Complexity** | Simple | Moderate |
| **Best for** | Testing, low frequency | Production, high frequency |

## Recommendations

### Use HTTP version when:
- Testing/development
- Sending data < 1 Hz (jarang)
- Network tidak stabil (auto-reconnect lebih mudah)

### Use WebSocket version when:
- Production deployment
- Sending data > 2 Hz (sering)
- Need lowest latency possible
- Multiple cameras sending simultaneously

## Installation

```powershell
# Install dependency
pip install websocket-client

# Test script
python opencv_camera_sender_ws.py

# Integrate ke kode OpenCV Anda
# Copy 3 lines:
from opencv_camera_sender_ws import CameraSenderWS
sender = CameraSenderWS(laptop_id=1)
sender.connect()
# ... di loop: sender.send(dista, distb, det_a, det_b)
```

## Files Modified

1. **NEW:** `opencv_camera_sender_ws.py` - WebSocket sender class
2. **MODIFIED:** `websocket_server.php` - Added `camera_data` handler & `enrichCameraData()` method

## Summary

✅ **WebSocket integration COMPLETE!**

Camera OpenCV dapat mengirim data langsung ke WebSocket server dengan 5 fields, server akan menambahkan 6 fields lagi, lalu broadcast ke semua client (admin + user pages).

**Flow lengkap:**
```
OpenCV (5 fields) → WebSocket → Server (+6 fields) → Broadcast → Admin & User Pages
```

**Ready to use!** Tinggal integrate ke kode OpenCV Anda dengan 3 baris kode. 🚀
