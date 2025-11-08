# ⚡ QUICK START - Deploy dalam 5 Menit

## 🎯 Goal
Deploy sistem detector getaran V2 (8-team real-time) SECEPAT mungkin.

---

## 📋 Prerequisites Check (30 detik)

```powershell
# 1. Cek Laragon running
Get-Process | Where-Object {$_.ProcessName -eq "nginx"}

# 2. Cek MySQL active
Get-Process | Where-Object {$_.ProcessName -eq "mysqld"}

# 3. Cek Composer installed
composer --version

# 4. Cek PHP version
php -v
# Harus >= 7.4
```

✅ **Semua OK? Lanjut!**

---

## 🚀 Deployment Steps

### STEP 1: Copy Files (1 menit)
```powershell
cd C:\Users\ghisy\Downloads\Projek\detector-getaran
Copy-Item -Path * -Destination "C:\laragon\www\detector-getaran\" -Recurse -Force
```

### STEP 2: Install Dependencies (1 menit)
```powershell
cd C:\laragon\www\detector-getaran
composer install
```

### STEP 3: Import Database (2 menit)
1. Buka: http://localhost/phpmyadmin
2. Login: `root` / `asya2105`
3. Select database: `db_detector_getaran` (create if not exist)
4. Import tab → Choose file: `database_v2.sql` → Go

### STEP 4: Insert Initial Data (30 detik)
```sql
-- Run di phpMyAdmin SQL tab
INSERT INTO teams (laptop_id, nama_tim) VALUES
(1, 'Tim 1'), (2, 'Tim 2'), (3, 'Tim 3'), (4, 'Tim 4'),
(5, 'Tim 5'), (6, 'Tim 6'), (7, 'Tim 7'), (8, 'Tim 8');
```

### STEP 5: Start WebSocket Server (30 detik)
```powershell
cd C:\laragon\www\detector-getaran
php websocket_server.php
```

**Expected Output:**
```
WebSocket server started on port 8080
Waiting for connections...
```

⚠️ **JANGAN CLOSE TERMINAL INI!**

---

## ✅ Verification (1 menit)

### Test 1: Admin Page
Buka: http://localhost/detector-getaran/admin_new.html

**Cek:**
- [ ] Status "Connected" (hijau)
- [ ] Timer display "00:00"
- [ ] Stats table 8 rows (Tim 1-8)
- [ ] 2 grafik kosong (Lantai 3 & 10)

### Test 2: Tim Page
Buka: http://localhost/detector-getaran/tim_1.html

**Cek:**
- [ ] Status "Connected"
- [ ] Team name "Tim 1"
- [ ] 5 frequency tabs
- [ ] 2 graph cards

### Test 3: Dummy Data (Optional)
```powershell
# Buka terminal BARU (jangan yang WebSocket)
$body = @{
    laptop_id = 1
    is_a_detected = 1
    is_b_detected = 1
    dista = 5.23
    distb = 3.87
    frequency = 1.5
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost/detector-getaran/db_insert_opencv.php" `
                  -Method POST `
                  -Body $body `
                  -ContentType "application/json"
```

**Refresh admin page → Grafik muncul data!**

---

## 🎉 DONE!

Sistem siap digunakan dalam **5 menit**!

### Access URLs:
- **Admin**: http://localhost/detector-getaran/admin_new.html
- **Tim 1-8**: http://localhost/detector-getaran/tim_X.html (ganti X = 1-8)

### Usage Flow:
1. Admin → Select frequency (1.5 Hz)
2. Admin → Mulai Rekaman
3. OpenCV 8 laptop → POST data ke `db_insert_opencv.php`
4. Monitor real-time di admin & tim pages
5. Auto-stop at 60 seconds (atau manual stop)
6. Export CSV jika butuh data

---

## 🆘 Quick Troubleshooting

| Problem | Fix |
|---------|-----|
| WebSocket not connected | Restart `php websocket_server.php` |
| Port 8080 error | `netstat -ano \| findstr :8080` → Kill process |
| Charts not updating | Hard refresh (Ctrl+Shift+R) |
| Database error | Check `db_config.php` password = `asya2105` |

---

**Butuh detail lengkap?** Baca `README_COMPLETE.md` atau `DEPLOYMENT_CHECKLIST.md`

**Last Updated**: 2025-01-XX
