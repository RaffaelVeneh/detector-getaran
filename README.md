# Sistem Detector Getaran Meja Getar

Website visualisasi real-time untuk uji getaran meja getar. Menampilkan grafik stamplot/spike untuk Gedung 3 Tingkat dan Gedung 10 Tingkat + simpangan besarannya berdasarkan data dari mikrokontroller.

## Fitur Utama

### 1. **Halaman Admin** (`admin.html`)
- Tambah, edit, dan hapus tim pengujian
- Manajemen database tim

### 2. **Halaman User** (`index.html`)
- Pilih tim untuk memulai pengujian
- Export data hasil uji ke CSV
- Daftar tim yang tersedia

### 3. **Halaman Visualisasi Real-Time** (`visualisasi.html`)
- **Grafik Stamplot/Spike**: Visualisasi displacement dengan bar chart
- **Dua Kolom**: Gedung 3 Tingkat dan Gedung 10 Tingkat  
- **Timer**: 00:00 - 01:00 (60 detik per sesi)
- **Data Real-time**:
  - Max Displacement (mm)
  - Realtime Displacement (mm)
  - Average Displacement (mm/s)
- **5 Sesi Frekuensi**: Navigasi antar frekuensi 1-5
- **Export CSV**: Ekspor data pengujian

## Struktur File

```
detector-getaran/
├── index.html           # Halaman utama (user)
├── admin.html           # Halaman admin
├── visualisasi.html     # Halaman visualisasi real-time
├── style.css            # Styling (Blue & White theme)
├── script.js            # JavaScript halaman utama
├── admin.js             # JavaScript halaman admin
├── visualisasi.js       # JavaScript visualisasi
├── db_config.php        # Konfigurasi database
├── api_teams.php        # API manajemen tim
├── api_save_test.php    # API simpan data uji
├── database.sql         # Struktur database SQL
├── data.json            # Data real-time dari mikrokontroller 
└── logo-uny.svg         # Logo UNY
```

## Setup Database

### 1. Buat Database
```sql
CREATE DATABASE db_detector_getaran;
```

### 2. Import Struktur
Import file `database.sql.example` ke database via phpMyAdmin atau MySQL CLI.

### 3. Konfigurasi
Edit `db_config.php`:
```php
$servername = "localhost";
$username = "root";
$password = "your_password";  // Sesuaikan
$dbname = "db_detector_getaran";
```

## Format Data JSON

**File `data.json` harus diupdate oleh mikrokontroller** dengan format:

```json
{
  "g3t_displacement": 2.5,
  "g10t_displacement": 3.2,
  "timestamp": 1699324800
}
```

- `g3t_displacement`: Displacement Gedung 3 Tingkat (mm)
- `g10t_displacement`: Displacement Gedung 10 Tingkat (mm)
- `timestamp`: Unix timestamp

**Update Interval**: Setiap 100ms (10x per detik) untuk visualisasi yang smooth.

## Format CSV Export

```
Timestamp, Waktu_Detik, G3T_Displacement_mm, G3T_MaxDisp_mm, G3T_AvgDisp_mm/s, G10T_Displacement_mm, G10T_MaxDisp_mm, G10T_AvgDisp_mm/s, Frekuensi_Sesi_Ke
```

## Catatan

1. **Data Real-Time**: Website membaca `data.json` setiap 100ms
2. **Mikrokontroller**: Harus update `data.json` minimal 10x per detik
3. **Timer**: Auto-stop setelah 60 detik per sesi
4. **Average Displacement**: Rata-rata simpangan besar (>2mm) / waktu
5. Karna diriku pake Laragon, aksesnya jadi lewat sini:   
User 
http://localhost/detector-getaran/index.html   
Admin
http://localhost/detector-getaran/admin.html   
Visualisasi
http://localhost/detector-getaran/visualisasi.html   

**Versi**: 2.0.0  
**Updated**: November 2025
