# API Endpoint untuk Kamera - Dokumentasi

## 📡 Endpoint: `receive_camera_data.php`

API endpoint untuk menerima data dari kamera/laptop tim. Kamera hanya perlu kirim data minimal, server akan menambahkan field-field lainnya secara otomatis.

---

## 🎯 URL

```
POST http://localhost/detector-getaran/api/receive_camera_data.php
```

---

## 📥 Request Format

### Headers
```
Content-Type: application/json
```

### Body (JSON)

Kamera **HANYA** perlu kirim 5 field ini:

```json
{
  "laptop_id": 1,
  "dista": 110.96,
  "distb": 91.64,
  "is_a_detected": true,
  "is_b_detected": true
}
```

### Field Explanation

| Field | Type | Required | Range | Description |
|-------|------|----------|-------|-------------|
| `laptop_id` | integer | ✅ Yes | 1-8 | ID laptop/tim yang mengirim |
| `dista` | float | ✅ Yes | -500 to 500 | Displacement Lantai 3 (mm) |
| `distb` | float | ✅ Yes | -500 to 500 | Displacement Lantai 10 (mm) |
| `is_a_detected` | boolean | ⚠️ Optional | true/false | Apakah Lantai 3 terdeteksi? (default: false) |
| `is_b_detected` | boolean | ⚠️ Optional | true/false | Apakah Lantai 10 terdeteksi? (default: false) |

---

## 📤 Response Format

### Success Response (HTTP 200)

```json
{
  "success": true,
  "message": "Data received and stored",
  "data": {
    // Data original dari kamera
    "laptop_id": 1,
    "dista": 110.96,
    "distb": 91.64,
    "is_a_detected": true,
    "is_b_detected": true,
    
    // Data yang DITAMBAHKAN server
    "category": "baja",
    "nama_tim": "Institut Teknologi Nasional Malang_TRISHA ABINAWA",
    "frequency": 1.5,
    "session_id": 1762761089,
    "relative_time": 5.50,
    "timestamp": "2025-11-10 12:34:56.789000"
  }
}
```

### Error Responses

#### 1. Missing Required Fields (HTTP 400)
```json
{
  "error": "Missing required fields",
  "required": ["laptop_id", "dista", "distb"],
  "received": ["laptop_id", "dista"]
}
```

#### 2. Invalid laptop_id (HTTP 400)
```json
{
  "error": "Invalid laptop_id. Must be 1-8."
}
```

#### 3. No Active Session (HTTP 400)
```json
{
  "error": "No active recording session",
  "message": "Admin must start recording first"
}
```

#### 4. Team Not Found (HTTP 404)
```json
{
  "error": "Team not found",
  "laptop_id": 1,
  "category": "baja"
}
```

#### 5. Database Error (HTTP 500)
```json
{
  "error": "Failed to insert data",
  "db_error": "..."
}
```

#### 6. Method Not Allowed (HTTP 405)
```json
{
  "error": "Method not allowed. Use POST."
}
```

---

## 🔄 Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    1. KAMERA KIRIM DATA                     │
│  {laptop_id, dista, distb, is_a_detected, is_b_detected}   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              2. SERVER TERIMA & CEK SESSION                 │
│  - Cek ada session aktif? (status='running')                │
│  - Ambil: session_id, category, frequency, started_at       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│               3. SERVER HITUNG RELATIVE_TIME                │
│  relative_time = waktu_sekarang - started_at                │
│  Max: 60 detik                                              │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│               4. SERVER GET NAMA_TIM                        │
│  Query: SELECT nama_tim FROM teams                          │
│         WHERE laptop_id=? AND category=?                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│               5. SERVER TAMBAH TIMESTAMP                    │
│  timestamp = YYYY-MM-DD HH:mm:ss.microseconds               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│            6. SERVER INSERT KE DATABASE                     │
│  INSERT INTO realtime_data (...)                            │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│           7. WEBSOCKET BROADCAST KE WEB                     │
│  (WebSocket server polling database setiap 100ms)           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│              8. WEB CLIENT UPDATE GRAFIK                    │
│  - Update chart dengan data baru                            │
│  - Update timer (sync dengan relative_time)                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing

### 1. Manual Test (curl)

```bash
curl -X POST http://localhost/detector-getaran/api/receive_camera_data.php \
  -H "Content-Type: application/json" \
  -d '{
    "laptop_id": 1,
    "dista": 50.25,
    "distb": 30.18,
    "is_a_detected": true,
    "is_b_detected": true
  }'
```

### 2. Python Test Script

```bash
# Test dengan laptop_id 1
python test_camera_api.py 1

# Test dengan laptop_id 2
python test_camera_api.py 2
```

### 3. Postman / Insomnia

**Method:** POST  
**URL:** `http://localhost/detector-getaran/api/receive_camera_data.php`  
**Headers:**
```
Content-Type: application/json
```
**Body (JSON):**
```json
{
  "laptop_id": 1,
  "dista": 110.96,
  "distb": 91.64,
  "is_a_detected": true,
  "is_b_detected": true
}
```

---

## ⚠️ Prerequisites

Sebelum kamera bisa kirim data, pastikan:

1. ✅ **Database sudah setup** (tabel `sessions`, `teams`, `realtime_data` ada)
2. ✅ **Admin sudah start recording** (ada session dengan status='running')
3. ✅ **WebSocket server running** (untuk broadcast ke web)
4. ✅ **Tim sudah terdaftar** (ada di tabel `teams` dengan laptop_id & category)

---

## 📊 Workflow Example

### Skenario: Recording dengan 2 tim

```
08:00:00 - Admin start recording (Baja, 1.5 Hz)
           → session_id = 1762761089 created
           
08:00:01 - Laptop 1 kirim data:
           {laptop_id: 1, dista: 50.2, distb: 30.1}
           → Server tambahkan:
             - category: "baja"
             - nama_tim: "Institut..."
             - frequency: 1.5
             - session_id: 1762761089
             - relative_time: 1
             - timestamp: "2025-11-10 08:00:01.000"
           
08:00:01 - Laptop 2 kirim data:
           {laptop_id: 2, dista: 40.5, distb: 28.9}
           → Server tambahkan:
             - category: "baja"
             - nama_tim: "Universitas..."
             - frequency: 1.5
             - session_id: 1762761089  (SAMA!)
             - relative_time: 1
             - timestamp: "2025-11-10 08:00:01.123"
             
08:00:02 - Laptop 1 kirim data lagi...
           → relative_time: 2
           
...

08:01:00 - Admin stop recording
           → session status = 'completed'
           → Kamera tidak bisa kirim lagi (error: no active session)
```

---

## 🔐 Security Notes

**Saat ini API TIDAK ada authentication/authorization!**

Untuk production, pertimbangkan:
1. API Key authentication
2. Rate limiting
3. IP whitelist
4. HTTPS only
5. Input validation lebih ketat

---

## 📝 Integration Example (Python)

```python
import requests
import time

class CameraClient:
    def __init__(self, laptop_id, api_url):
        self.laptop_id = laptop_id
        self.api_url = api_url
    
    def send_data(self, dista, distb, is_a_detected=True, is_b_detected=True):
        """Kirim data ke server"""
        payload = {
            "laptop_id": self.laptop_id,
            "dista": dista,
            "distb": distb,
            "is_a_detected": is_a_detected,
            "is_b_detected": is_b_detected
        }
        
        try:
            response = requests.post(self.api_url, json=payload, timeout=5)
            return response.json()
        except Exception as e:
            return {"error": str(e)}
    
    def stream_data(self, interval=0.5):
        """Stream data secara berkala"""
        while True:
            # Baca displacement dari kamera/sensor
            dista = read_displacement_a()  # Your code
            distb = read_displacement_b()  # Your code
            
            # Kirim ke server
            result = self.send_data(dista, distb)
            
            if result.get('success'):
                print(f"✅ Data sent at {result['data']['relative_time']}s")
            else:
                print(f"❌ Failed: {result.get('error')}")
            
            time.sleep(interval)

# Usage
camera = CameraClient(
    laptop_id=1,
    api_url="http://localhost/detector-getaran/api/receive_camera_data.php"
)
camera.stream_data(interval=0.5)
```

---

## ❓ FAQ

**Q: Apakah kamera harus kirim timestamp?**  
A: TIDAK. Server yang otomatis tambahkan timestamp.

**Q: Apakah kamera harus hitung relative_time?**  
A: TIDAK. Server yang hitung dari started_at session.

**Q: Apakah kamera harus tahu session_id?**  
A: TIDAK. Server yang ambil dari session aktif.

**Q: Berapa sering kamera harus kirim data?**  
A: Recommended 0.5 detik (2x per detik) atau sesuai kebutuhan.

**Q: Apa yang terjadi jika kirim data saat tidak ada session aktif?**  
A: Server return error 400: "No active recording session"

**Q: Apakah bisa kirim data untuk laptop_id yang tidak terdaftar?**  
A: Server return error 404: "Team not found"
