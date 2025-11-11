# Clear All Data Feature - Documentation

## 🎯 Purpose

Button **"Clear All Data"** untuk menghapus semua data testing/percobaan agar database clean untuk percobaan baru.

**Use case:** Saat testing atau percobaan ulang, data lama tidak perlu disimpan di database dan tidak ikut ter-export ke CSV.

---

## ✅ Features Implemented

### 1. **API Endpoint**

File: `api/clear_data.php`

**Endpoint:** `POST /detector-getaran/api/clear_data.php`

**What it does:**
- ✅ Delete semua data di `realtime_data` table
- ✅ Delete semua data di `statistics` table  
- ✅ Stop semua session aktif (`status='running'` → `'stopped'`)
- ✅ Reset AUTO_INCREMENT counter (start from 1)
- ✅ Clear broadcast queue file (`temp/broadcast_queue.jsonl`)
- ✅ Return summary: berapa data yang dihapus

**What it preserves:**
- ✅ `teams` table (laptop_id, nama tim)
- ✅ `categories` table (Baja, Beton)
- ✅ `sessions` table (history tetap ada, status diupdate)

**Response:**
```json
{
  "success": true,
  "message": "All data cleared successfully",
  "deleted": {
    "realtime_data": "10917",
    "statistics": "223",
    "stopped_sessions": "0",
    "broadcast_queue": "cleared"
  },
  "preserved": {
    "teams": "kept",
    "categories": "kept",
    "sessions_history": "kept (status updated to stopped)"
  },
  "timestamp": "2025-11-10 19:43:58"
}
```

### 2. **UI Button**

File: `admin_new_v3.html`

**Location:** Di samping button "Freeze All Data" di section Timer Control

**Visual:**
- 🗑️ Icon trash (delete)
- Red color (`#dc3545`)
- Label: "Clear All Data"

**Styling:**
```html
<button class="btn btn-danger" id="clearDataBtn" style="margin-left: 10px; background-color: #dc3545;">
    <svg><!-- trash icon --></svg>
    Clear All Data
</button>
```

### 3. **JavaScript Handler**

File: `admin_new_v3.js`

**Function:** `clearAllData()`

**Flow:**
1. **Confirmation dialog** (double-check dengan user)
2. **Show loading** (button disabled + spinner)
3. **Call API** (`POST /api/clear_data.php`)
4. **Clear local data structures** (dataByTeamAndFreq)
5. **Reset UI state** (timer, buttons, frozen snapshot)
6. **Update charts & stats** (empty state)
7. **Broadcast to clients** (WebSocket clear_data command)
8. **Show success message** dengan summary

**Safety Features:**
- ⚠️ Confirmation dialog dengan detail apa yang akan dihapus
- 🔒 Button disabled saat proses clear (prevent double-click)
- 🔄 Loading indicator dengan spin animation
- ✅ Success/error alert dengan detail

### 4. **CSS Animation**

File: `style.css`

**Added:**
```css
@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
```

**Usage:** Loading spinner saat clear data

---

## 🚀 Usage

### For Admin:

1. **Open admin page:** `admin_new_v3.html`
2. **Click button:** "Clear All Data" (di kanan atas)
3. **Confirm:** Read warning dan klik OK
4. **Wait:** Proses 1-2 detik (tergantung jumlah data)
5. **Success:** Alert muncul dengan summary berapa data dihapus

### For Testing/Percobaan:

**Scenario:** Setelah percobaan pertama, mau reset database untuk percobaan kedua

**Before:**
```
Database berisi:
- 10,000+ realtime_data dari percobaan 1
- 200+ statistics
- Session history lengkap
```

**After Clear:**
```
Database:
- 0 realtime_data ✅
- 0 statistics ✅
- Teams masih ada (Tim Baja 1-8, Tim Beton 1-8) ✅
- Categories masih ada (Baja, Beton) ✅
- Session history tetap ada (untuk audit trail) ✅
```

---

## 🔒 Safety Mechanisms

### 1. Confirmation Dialog

```javascript
const confirmation = confirm(
    '⚠️ WARNING: Clear All Data\n\n' +
    'Ini akan menghapus:\n' +
    '• Semua data realtime_data\n' +
    '• Semua statistics\n' +
    '• Stop semua session aktif\n\n' +
    'Data yang TETAP ADA:\n' +
    '• Teams\n' +
    '• Categories\n' +
    'Lanjutkan?'
);
```

User harus explicitly klik "OK" untuk confirm.

### 2. Transaction Safety (Database)

```php
$conn->begin_transaction();
try {
    // Delete operations
    $conn->commit();
} catch (Exception $e) {
    $conn->rollback();  // Rollback if error
}
```

All-or-nothing: Kalau ada error, semua rollback (tidak ada partial delete).

### 3. Button State Management

```javascript
clearBtn.disabled = true;  // Prevent double-click
clearBtn.innerHTML = '...Clearing...';  // Visual feedback
```

User tidak bisa klik button lagi saat proses berjalan.

### 4. WebSocket Broadcast

```javascript
ws.send(JSON.stringify({
    type: 'clear_data',
    message: 'All data cleared by admin'
}));
```

Notify semua connected clients (user pages) bahwa data sudah di-clear.

---

## 📊 Testing Results

### Test 1: Clear with Data

**Before:**
- realtime_data: 10,917 rows
- statistics: 223 rows
- active_sessions: 0

**Command:**
```bash
curl -X POST http://localhost/detector-getaran/api/clear_data.php
```

**Result:**
```json
{
  "success": true,
  "deleted": {
    "realtime_data": "10917",
    "statistics": "223",
    "stopped_sessions": "0"
  }
}
```

✅ **SUCCESS!** All data cleared, database clean.

### Test 2: Clear Empty Database

**Before:**
- realtime_data: 0 rows
- statistics: 0 rows

**Result:**
```json
{
  "success": true,
  "deleted": {
    "realtime_data": "0",
    "statistics": "0"
  }
}
```

✅ **SUCCESS!** No error when clearing empty database.

### Test 3: Verify Preserved Data

**After clear:**
```sql
SELECT * FROM teams;
-- Result: 16 rows (Baja 1-8, Beton 1-8) ✅

SELECT * FROM categories;
-- Result: 2 rows (Baja, Beton) ✅

SELECT * FROM sessions WHERE status = 'stopped';
-- Result: Previous sessions still exist ✅
```

✅ **SUCCESS!** Important data preserved.

---

## 🎯 User Experience

### Workflow:

```
[Admin clicks "Clear All Data"]
    ↓
[⚠️ Confirmation dialog appears]
    ↓
[User reads warning & clicks OK]
    ↓
[🔄 Button shows "Clearing..." with spinner]
    ↓
[API deletes data (1-2 seconds)]
    ↓
[✅ Success alert with summary]
    ↓
[Charts & stats cleared, UI reset]
    ↓
[Ready for new percobaan!]
```

### Visual Feedback:

1. **Before click:** Red button with trash icon
2. **During clear:** Button disabled, spinner animation
3. **After success:** Alert shows summary
4. **UI state:** All charts empty, timer reset to 00:00

---

## 🔧 Maintenance

### To modify what gets deleted:

Edit `api/clear_data.php`:

```php
// Add more tables to clear
$conn->query("DELETE FROM another_table");

// Or add conditions
$conn->query("DELETE FROM realtime_data WHERE created_at < DATE_SUB(NOW(), INTERVAL 1 WEEK)");
```

### To modify confirmation message:

Edit `admin_new_v3.js` line ~670:

```javascript
const confirmation = confirm(
    'Your custom message here'
);
```

### To change button position/style:

Edit `admin_new_v3.html` line ~65:

```html
<button class="btn btn-danger" id="clearDataBtn" style="your-custom-styles">
```

---

## 📋 Files Changed

1. ✅ `api/clear_data.php` - NEW API endpoint
2. ✅ `admin_new_v3.html` - Added button
3. ✅ `admin_new_v3.js` - Added `clearAllData()` function
4. ✅ `style.css` - Added spin animation
5. ✅ `CLEAR_DATA_FEATURE.md` - THIS FILE (documentation)

---

## ⚠️ Important Notes

### What gets deleted:
- ✅ ALL realtime_data (no conditions)
- ✅ ALL statistics (CASCADE from realtime_data foreign key)
- ✅ Active sessions stopped (status updated)
- ✅ Broadcast queue file deleted

### What is preserved:
- ✅ Teams (laptop_id, nama_tim)
- ✅ Categories (Baja, Beton)
- ✅ Session history (for audit trail)
- ✅ Database structure (tables, indexes, etc.)

### When to use:
- ✅ After testing/percobaan
- ✅ Before starting new experiment
- ✅ When data is incorrect and needs reset
- ✅ For database cleanup during development

### When NOT to use:
- ❌ During active recording (stop session first!)
- ❌ If you need to keep data for analysis
- ❌ In production with real data
- ❌ Without confirmation from team leader

---

## 🚀 Deployment Checklist

- [x] API endpoint created
- [x] UI button added
- [x] JavaScript handler implemented
- [x] CSS animation added
- [x] Tested with data (10K+ rows)
- [x] Tested with empty database
- [x] Verified data preservation (teams, categories)
- [x] WebSocket broadcast working
- [x] Documentation complete

**Status: ✅ READY FOR USE**

---

## 💡 Future Improvements

1. **Selective Clear:**
   - Option to clear only specific category (Baja or Beton)
   - Option to clear only specific date range
   - Option to clear only specific team

2. **Backup Before Clear:**
   - Auto-create backup file before clearing
   - Export to CSV before delete
   - Restore from backup option

3. **Clear History Log:**
   - Track who cleared data and when
   - Log to separate table for audit
   - Show last 10 clear operations

4. **Scheduled Auto-Clear:**
   - Auto-clear old data (>7 days)
   - Configurable retention period
   - Email notification after auto-clear

---

**Created:** 2025-11-10  
**Version:** 1.0  
**Status:** Production Ready ✅
