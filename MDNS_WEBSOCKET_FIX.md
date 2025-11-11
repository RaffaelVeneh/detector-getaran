# Troubleshooting mDNS WebSocket Connection

## Masalah
WebSocket disconnected saat mengakses dari `Asya.local` (atau hostname/IP lain).

## Solusi yang Sudah Diterapkan

### 1. ✅ Dynamic WebSocket URL
**File yang diupdate:**
- `tim_client_v3.js` (line ~230)
- `admin_new_v3.js` (line ~99)

**Perubahan:**
```javascript
// SEBELUM (hardcoded localhost)
ws = new WebSocket('ws://localhost:8080');

// SESUDAH (dynamic hostname)
const wsHost = window.location.hostname || 'localhost';
const wsUrl = `ws://${wsHost}:8080`;
console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
ws = new WebSocket(wsUrl);
```

Sekarang WebSocket akan otomatis menggunakan hostname yang sama dengan URL page:
- `http://localhost/...` → `ws://localhost:8080`
- `http://192.168.1.100/...` → `ws://192.168.1.100:8080`
- `http://Asya.local/...` → `ws://Asya.local:8080`

### 2. ✅ WebSocket Server Sudah Bind ke 0.0.0.0
Server sudah dikonfigurasi untuk menerima koneksi dari semua network interface:
```php
new \React\Socket\Server('0.0.0.0:8080', $loop)
```

### 3. ✅ Firewall Rule Sudah Ada
Port 8080 sudah dibuka di Windows Firewall (TCP 8080-8082).

## Langkah Testing

### Test 1: Cek dari Browser Server (localhost)
1. Buka: `http://localhost/detector-getaran/test_websocket_connection.html`
2. Klik tombol "Test Connection"
3. Harus muncul "✅ Connected!"

### Test 2: Cek dari Komputer Client (Asya.local)
1. Dari komputer lain, buka: `http://Asya.local/detector-getaran/test_websocket_connection.html`
2. Klik tombol "Test Connection"
3. Perhatikan log message

### Test 3: Cek Page User/Admin
1. Buka halaman user: `http://Asya.local/detector-getaran/tim_1_v3.html`
2. Lihat status di navbar atas (kanan atas)
3. Buka Browser Console (F12) dan lihat log:
   - Harus ada: `🔌 Connecting to WebSocket: ws://Asya.local:8080`
   - Harus ada: `✅ WebSocket Connected`

## Troubleshooting Jika Masih Gagal

### A. Cek WebSocket Server Running
```powershell
# Di server, jalankan:
netstat -ano | findstr :8080
```
Harus ada output seperti:
```
TCP    0.0.0.0:8080           0.0.0.0:0              LISTENING
```

Jika tidak ada, restart WebSocket server:
```powershell
# Stop server (Ctrl+C di terminal yang menjalankan)
# Lalu start lagi:
cd C:\laragon\www\detector-getaran
php websocket_server.php
```

### B. Test Port Accessibility dari Client
Di komputer client, test apakah bisa reach port 8080:

**Dari PowerShell:**
```powershell
Test-NetConnection -ComputerName Asya.local -Port 8080
```

**Dari Command Prompt:**
```cmd
telnet Asya.local 8080
```

Jika koneksi **gagal**, kemungkinan:
1. Firewall Windows memblok koneksi dari network
2. Network setting tidak mengizinkan

### C. Buka Port di Windows Firewall (Manual)
Jika rule tidak ada atau tidak bekerja:

```powershell
# Jalankan sebagai Administrator
netsh advfirewall firewall add rule name="WebSocket Server 8080" dir=in action=allow protocol=TCP localport=8080
```

### D. Cek mDNS Resolution
Pastikan `Asya.local` bisa di-resolve:

```powershell
ping Asya.local
```

Jika ping berhasil, berarti mDNS OK. Jika gagal:
- Pastikan Bonjour service running di server
- Gunakan IP address langsung: `http://192.168.x.x/detector-getaran/...`

### E. Alternatif: Gunakan IP Address
Jika mDNS tidak stabil, gunakan IP address langsung:
1. Di server, cek IP: `ipconfig`
2. Catat IP address (contoh: 192.168.1.100)
3. Akses dari client: `http://192.168.1.100/detector-getaran/tim_1_v3.html`

WebSocket akan otomatis connect ke `ws://192.168.1.100:8080`

## Expected Behavior Setelah Fix

### User Page (tim_X_v3.html)
- Status di navbar: "Connected" (hijau)
- Console log:
  ```
  🔌 Connecting to WebSocket: ws://Asya.local:8080
  ✅ WebSocket Connected
  🔍 Checking for active session after WebSocket connected...
  ```

### Admin Page (admin_new_v3.html)
- Status di navbar: "Connected" (hijau)
- Saat klik "Mulai Rekaman":
  - Admin broadcast via WebSocket
  - User pages langsung terima event `session_started`
  - Timer di semua page mulai sinkron

## Debugging Tips

### Browser Console Commands
```javascript
// Cek WebSocket URL yang digunakan
console.log('WS Host:', window.location.hostname);

// Cek status WebSocket
console.log('WS State:', ws.readyState);
// 0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED

// Manual check active session
checkActiveSession();
```

### Server Log
WebSocket server menampilkan log setiap koneksi:
```
[HH:MM:SS] ✅ New client connected (Total: X clients)
[HH:MM:SS] ✅ Broadcasted 'session_started' from admin to N clients
[HH:MM:SS] ❌ Client disconnected (Total: X clients)
```

## Verification Checklist

✅ File updated dengan dynamic WebSocket URL:
- [x] tim_client_v3.js
- [x] admin_new_v3.js

✅ WebSocket server berjalan di port 8080
✅ Server bind ke 0.0.0.0 (all interfaces)
✅ Firewall rule untuk port 8080 ada
✅ Test page tersedia: test_websocket_connection.html

⏳ **Testing diperlukan dari komputer client!**

## Quick Test Command

Dari komputer client, buka browser dan jalankan di console:
```javascript
const ws = new WebSocket('ws://Asya.local:8080');
ws.onopen = () => console.log('✅ Connected!');
ws.onerror = (e) => console.error('❌ Error:', e);
ws.onclose = () => console.log('🔴 Closed');
```

Jika muncul "✅ Connected!" berarti WebSocket sudah bisa diakses!
