# 📡 INFORMASI KONEKSI SERVER

**Tanggal Update**: 11 November 2025

---

## ✅ SERVER SUDAH ONLINE!

**Laptop Server**: Asya  
**Status Laragon**: ✅ RUNNING (Apache port 80, MySQL port 3306)

---

## 🌐 IP ADDRESS SERVER

**IP Address untuk Camera Connection**:
```
192.168.43.26
```

**Network**: WiFi Hotspot 192.168.43.x

---

## 🔧 SETUP DI LAPTOP CAMERA

### Langkah 1: Pastikan Terhubung ke Network yang Sama

Di laptop camera, cek koneksi:
```powershell
ipconfig
```

Pastikan IPv4 Address di range yang sama:
- ✅ BENAR: `192.168.43.xxx` (contoh: 192.168.43.100, 192.168.43.200)
- ❌ SALAH: IP berbeda (192.168.1.x, 10.0.0.x, dll)

Jika berbeda, connect ke WiFi/Hotspot yang sama dengan server!

---

### Langkah 2: Test Koneksi ke Server

Di laptop camera, jalankan test ini di PowerShell:

**Test 1: Ping Server**
```powershell
ping 192.168.43.26 -n 2
```
✅ Expected: `Reply from 192.168.43.26: bytes=32 time=...ms`

**Test 2: Test HTTP Port**
```powershell
Test-NetConnection -ComputerName 192.168.43.26 -Port 80
```
✅ Expected: `TcpTestSucceeded : True`

**Test 3: Test Web Access**
```powershell
curl http://192.168.43.26/detector-getaran/
```
✅ Expected: HTML content (halaman web)

---

### Langkah 3: Jalankan Camera Script

1. **Buka refactor_aruco.py** (atau camera script lainnya)

2. **Masukkan Server Address**:
   ```
   Server Address: 192.168.43.26
   ```

3. **Atau gunakan hostname** (jika mDNS bekerja):
   ```
   Server Address: Asya.local
   Server Address: Asya
   ```

4. **Click "Test Connection"** untuk verify

5. **Click "Start Detection"** untuk mulai kirim data

---

## 📊 TEST API ENDPOINT

Jika ingin test API secara manual dari laptop camera:

**Using Python**:
```python
import requests

url = "http://192.168.43.26/detector-getaran/api/receive_camera_data.php"
data = {
    "laptop_id": 1,
    "dista": 10.5,
    "distb": 15.2,
    "is_a_detected": True,
    "is_b_detected": True
}

response = requests.post(url, json=data, timeout=5)
print(f"Status: {response.status_code}")
print(response.json())
```

**Expected Response** (jika belum ada session):
```json
{
  "success": true,
  "mode": "free",
  "message": "Data received successfully"
}
```

**Expected Response** (jika ada session aktif):
```json
{
  "success": true,
  "mode": "recording",
  "message": "Data received successfully"
}
```

---

## 🚨 TROUBLESHOOTING

### Problem: "Cannot connect" / Timeout
**Solusi**:
1. Pastikan kedua laptop di network yang sama (192.168.43.x)
2. Cek Laragon running di server (lihat icon hijau)
3. Coba disable firewall sementara di server:
   ```powershell
   Set-NetFirewallProfile -Profile Private -Enabled False
   ```
4. Restart Laragon jika perlu

### Problem: "Cannot resolve hostname"
**Solusi**:
- Gunakan IP address langsung: `192.168.43.26`
- Jangan pakai hostname jika tidak work

### Problem: "Connection refused"
**Solusi**:
1. Pastikan Apache (port 80) running
2. Buka browser di server: http://localhost/detector-getaran/
3. Jika tidak bisa, restart Laragon

### Problem: "Different network"
**Solusi**:
1. Server: Aktifkan Mobile Hotspot
2. Camera: Connect ke hotspot server
3. Atau: Kedua laptop connect ke WiFi router yang sama

---

## ✅ CHECKLIST KONEKSI

**Di Laptop Server (Asya)**:
- [x] Laragon running (Apache hijau)
- [x] IP address: 192.168.43.26
- [x] Database migration sudah dijalankan
- [x] Web accessible: http://localhost/detector-getaran/

**Di Laptop Camera**:
- [ ] Terhubung ke network yang sama (192.168.43.x)
- [ ] Ping ke 192.168.43.26 berhasil
- [ ] Test HTTP port 80 berhasil
- [ ] Camera script siap (refactor_aruco.py)
- [ ] Server address: 192.168.43.26

---

## 🎯 QUICK START

**Dari Laptop Camera**, jalankan:

```powershell
# 1. Cek koneksi
ping 192.168.43.26 -n 2

# 2. Test HTTP
curl http://192.168.43.26/detector-getaran/

# 3. Jalankan camera script
python refactor_aruco.py
# Masukkan Server Address: 192.168.43.26
# Click "Test Connection"
# Click "Start Detection"
```

**Dari Laptop Server**, monitoring:
1. Buka browser: http://localhost/detector-getaran/admin_new_v3.html
2. Start recording session
3. Lihat data masuk dari camera

---

## 📝 CATATAN PENTING

- **IP Address bisa berubah** setiap kali restart hotspot/router
- Jika IP berubah, cek ulang dengan `ipconfig` di server
- Update IP address di camera script sesuai IP baru
- **Free Mode**: Data bisa masuk tanpa start recording (sejak update terbaru)
- **Recording Mode**: Data dengan session_id saat recording aktif

---

**Last Verified**: 11 November 2025 - Laragon running, port 80 accessible ✅
