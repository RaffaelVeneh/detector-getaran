# 🚀 DEPLOYMENT INSTRUCTIONS

## ✅ Files Sudah Di-Copy ke Laragon

Semua file sudah ada di: `C:\laragon\www\detector-getaran\`

---

## 📝 Next Steps (Ikuti Urutan Ini):

### STEP 1: Buka Laragon Terminal
1. Buka **Laragon**
2. Klik **Menu** (kanan atas)
3. Pilih **Terminal**

Terminal akan terbuka dengan PHP & Composer sudah di PATH.

---

### STEP 2: Run Deployment Script
```bash
cd C:\laragon\www\detector-getaran
deploy_to_laragon.bat
```

Script ini akan:
1. ✅ Install Composer dependencies (Ratchet WebSocket)
2. ⏸️ Pause untuk setup database manual
3. ✅ Test database connection
4. ✅ Start WebSocket server (port 8080)

---

### STEP 3: Database Setup (Saat Script Pause)

Script akan pause di step 2, lakukan ini:

1. **Buka phpMyAdmin**: http://localhost/phpmyadmin
2. **Login**: 
   - Username: `root`
   - Password: `asya2105`
3. **Select Database**: `db_detector_getaran` (buat dulu jika belum ada)
4. **Import Schema**:
   - Click tab **Import**
   - Choose file: `C:\laragon\www\detector-getaran\database_v2.sql`
   - Click **Go**
   - Wait for success message
5. **Insert Team Data**:
   - Click tab **SQL**
   - Copy-paste query ini:
   ```sql
   INSERT INTO teams (laptop_id, nama_tim) VALUES
   (1, 'Tim 1'), (2, 'Tim 2'), (3, 'Tim 3'), (4, 'Tim 4'),
   (5, 'Tim 5'), (6, 'Tim 6'), (7, 'Tim 7'), (8, 'Tim 8');
   ```
   - Click **Go**
6. **Verify**: Should see "8 rows inserted"

7. **Kembali ke Terminal** → Press ENTER untuk continue script

---

### STEP 4: WebSocket Server Running

Setelah press ENTER, script akan start WebSocket server:

```
WebSocket server started on port 8080
Waiting for connections...
```

✅ **Keep terminal window OPEN** (jangan close!)

---

## 🧪 STEP 5: Testing

### A. Test Admin Page
1. Buka browser: http://localhost/detector-getaran/admin_new.html
2. Check:
   - ✅ Status "Connected" (hijau)
   - ✅ Timer display "00:00"
   - ✅ Stats table 8 rows (Tim 1-8)
   - ✅ 2 empty graphs

### B. Test Tim Page
1. Buka: http://localhost/detector-getaran/tim_1.html
2. Check:
   - ✅ Status "Connected"
   - ✅ Team name "Tim 1"
   - ✅ 5 frequency tabs
   - ✅ 2 graph cards

### C. Test Dummy Data (Optional)
**Buka terminal BARU** (jangan yang running WebSocket), lalu:

```bash
cd C:\laragon\www\detector-getaran
test_deployment.bat
```

Script akan inject 10 dummy data points.

**Refresh admin & tim pages** → Grafik muncul data! 📊

---

## ✅ Deployment Complete!

### Access URLs:
- **Admin**: http://localhost/detector-getaran/admin_new.html
- **Tim 1**: http://localhost/detector-getaran/tim_1.html
- **Tim 2**: http://localhost/detector-getaran/tim_2.html
- ... (hingga tim_8.html)

### Usage:
1. Admin page → Select frequency (1.5 Hz)
2. Click "Mulai Rekaman"
3. OpenCV laptops → POST data
4. Monitor real-time
5. Auto-stop at 60s

---

## 🛠️ Troubleshooting

### WebSocket Not Connected?
```bash
# Restart server (Ctrl+C di terminal WebSocket, lalu):
php websocket_server.php
```

### Port 8080 Already in Use?
```bash
# Check what's using port 8080:
netstat -ano | findstr :8080

# Kill process (replace PID):
taskkill /PID <PID> /F
```

### Database Connection Error?
Check `db_config.php`:
- Password: `asya2105`
- Database: `db_detector_getaran`

---

## 📚 Documentation

- **Complete Guide**: `README_COMPLETE.md`
- **Full Checklist**: `DEPLOYMENT_CHECKLIST.md`
- **Quick Start**: `QUICK_START.md`

---

**Status**: Ready to Deploy! 🎉
**Last Updated**: 2025-11-08
