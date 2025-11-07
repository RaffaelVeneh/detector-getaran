# LOGIKA EXPORT CSV - SISTEM DETECTOR GETARAN

## Konsep Export Data

### **A. Export di User Page (index.html)**
**Fungsi:** Export **SEMUA data** dari **SEMUA sesi** yang sudah dilakukan tim
**Kapan digunakan:** 
- Untuk review keseluruhan performa tim
- Untuk laporan akhir
- Untuk analisis komparatif antar sesi

**Flow:**
1. User klik "Export Data CSV"
2. Pilih tim yang ingin diexport
3. Pop-up konfirmasi: "Apakah Anda ingin export data tim [NAMA] ke dalam bentuk CSV?"
4. Jika OK → Download CSV dengan **semua data dari Frekuensi 1-5** (yang sudah ada)
5. Jika tim belum ada data → Alert "Tidak ada data pengujian"

---

### **B. Export di Halaman Visualisasi (visualisasi.html)**
**Fungsi:** Export **data PER SESI** yang sedang aktif
**Kapan digunakan:** 
- Setelah selesai 1 sesi frekuensi
- Untuk backup data realtime
- Sebelum pindah ke frekuensi berikutnya

**Flow:**
1. Setelah pengujian Frekuensi 1 selesai → Klik "Export Data CSV"
2. Pop-up konfirmasi dengan detail:
   - Nama Tim
   - Frekuensi berapa
   - Jumlah data points
   - Status (selesai/sedang berjalan)
3. Jika OK → Download CSV **hanya Frekuensi aktif**
4. Format nama file: `NamaTim_Frekuensi1_2025-11-07.csv`

---

## Handling Kasus Gedung Roboh

### **Skenario:**
Tim melakukan pengujian:
- Frekuensi 1: Selesai (60 detik)
- Frekuensi 2: Selesai (60 detik)
- Frekuensi 3: Gedung roboh di detik 35
- Frekuensi 4 & 5: Tidak dilakukan

### **Solusi yang Diterapkan:**

#### **1. Auto-Save saat Berhenti**
```javascript
function stopTest() {
    // Langsung save data ke MySQL
    saveTestData(); // ← Ini akan save data yang sudah terkumpul
}
```

#### **2. Save Partial Data**
- Data yang tersimpan: **0 - 35 detik** (meskipun belum 60 detik)
- Status sesi: "incomplete" atau "roboh"
- Timestamp roboh: Dicatat

#### **3. Export Fleksibel**
```csv
# File: TRISHA_ABINAWA_AllSessions_2025-11-07.csv

Frekuensi,Status,Durasi,G3T_MaxDisp,G10T_MaxDisp
1,Selesai,60s,5.2mm,7.8mm
2,Selesai,60s,6.1mm,9.3mm
3,Roboh,35s,8.5mm,12.1mm
4,Tidak dilakukan,-,-,-
5,Tidak dilakukan,-,-,-
```

---

## Struktur File CSV

### **Format 1: Export dari User Page (Lengkap)**
```csv
Timestamp,Frekuensi,Waktu_Detik,G3T_Disp,G3T_Max,G3T_Avg,G10T_Disp,G10T_Max,G10T_Avg,Status
2025-11-07 10:00:01,1,0.1,0.5,0.5,0.5,0.8,0.8,0.8,running
2025-11-07 10:00:02,1,0.2,1.2,1.2,0.85,1.5,1.5,1.15,running
...
2025-11-07 10:01:00,1,60.0,3.2,5.2,2.8,4.5,7.8,3.9,selesai
2025-11-07 10:02:01,2,0.1,0.6,0.6,0.6,0.9,0.9,0.9,running
...
2025-11-07 10:03:35,3,35.0,8.5,8.5,4.2,12.1,12.1,6.3,ROBOH
```

### **Format 2: Export dari Visualisasi (Per Sesi)**
```csv
Timestamp,Waktu_Detik,G3T_Displacement,G3T_Max,G3T_Avg,G10T_Displacement,G10T_Max,G10T_Avg
2025-11-07 10:00:01,0.1,0.5,0.5,0.5,0.8,0.8,0.8
2025-11-07 10:00:02,0.2,1.2,1.2,0.85,1.5,1.5,1.15
...
2025-11-07 10:01:00,60.0,3.2,5.2,2.8,4.5,7.8,3.9
```

---

## Workflow Pengujian

```
START
  │
  ├─> Pilih Tim
  │
  ├─> Frekuensi 1
  │   ├─> Mulai (timer auto-start saat data masuk)
  │   ├─> Monitor 60 detik
  │   ├─> Auto stop / Manual stop / ROBOH
  │   └─> [EXPORT CSV Frek 1] ← OPTIONAL
  │
  ├─> Klik Next → Frekuensi 2
  │   ├─> Reset data
  │   ├─> Mulai lagi
  │   └─> ...
  │
  ├─> ... dst sampai Frekuensi 5
  │
  └─> [EXPORT ALL DATA] di User Page
```

---

## Catatan Penting

1. **Data tidak hilang meskipun pindah frekuensi** - Semua tersimpan di MySQL
2. **Export bisa kapan saja** - Tidak harus setelah semua sesi selesai
3. **Transparansi data roboh** - Tercatat lengkap dengan timestamp
4. **Keabsahan data** - Semua timestamped, ora bisa dimanipulasi
5. **Button prev/next** - Hanya bisa diklik kalau pengujian tidak sedang berjalan

---

**Kesimpulan:**
Export CSV sekarang **cerdas dan fleksibel** - bisa export per sesi atau keseluruhan, dengan handling otomatis untuk kasus gedung roboh di tengah jalan!
