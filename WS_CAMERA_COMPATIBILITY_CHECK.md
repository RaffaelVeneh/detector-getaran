# WebSocket Camera Integration - Compatibility Check ✅

## Status: FIXED & COMPATIBLE

## Problem Found
WebSocket server mengirim data dari kamera dalam format **single object**, tapi website (admin & user pages) mengharapkan **array of objects**.

## Analysis

### Expected Format (Website)
**Admin page** (`admin_new_v3.js` line 217):
```javascript
function processNewData(newDataArray) {
    newDataArray.forEach(item => {  // ← Expects ARRAY
        const laptopId = item.laptop_id;
        // ...
    });
}
```

**User page** (`tim_client_v3.js` line 293):
```javascript
if (message.type === 'new_data' && Array.isArray(message.data)) {
    message.data.forEach(item => {  // ← Expects ARRAY
        if (item.laptop_id === LAPTOP_ID) {
            // ...
        }
    });
}
```

### Original Server Output (WRONG)
```php
// websocket_server.php - enrichCameraData() BEFORE FIX
return [
    'type' => 'new_data',
    'laptop_id' => 1,        // ← Direct properties
    'dista' => 5.2,
    'distb' => 3.1,
    // ... (single object, NOT array!)
];
```

**This would cause:** `newDataArray.forEach()` to fail because it's an object, not array.

### Fixed Server Output (CORRECT) ✅
```php
// websocket_server.php - enrichCameraData() AFTER FIX
return [
    'type' => 'new_data',
    'data' => [              // ← Wrapped in array!
        [
            'laptop_id' => 1,
            'dista' => 5.2,
            'distb' => 3.1,
            'is_a_detected' => true,
            'is_b_detected' => true,
            'session_id' => 42,
            'category' => 'baja',
            'frequency' => 1.5,
            'relative_time' => 15,
            'elapsed_seconds' => 15,
            'timestamp' => '2025-11-10 14:30:45'
        ]
    ]
];
```

**Now compatible with:**
- ✅ Admin page: `processNewData(message.data)` → `message.data.forEach()`
- ✅ User page: `message.data.forEach()` with `item.laptop_id === LAPTOP_ID` filter

## Complete Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. CAMERA (opencv_camera_sender_ws.py)                             │
│    Sends 5 fields:                                                  │
│    {                                                                │
│        "type": "camera_data",                                       │
│        "laptop_id": 1,                                              │
│        "dista": 5.234,                                              │
│        "distb": 3.456,                                              │
│        "is_a_detected": true,                                       │
│        "is_b_detected": true                                        │
│    }                                                                │
└───────────────────────────┬─────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────────┐
│ 2. WEBSOCKET SERVER (websocket_server.php)                         │
│    Receives camera_data → enrichCameraData()                        │
│    - Get session info from DB (category, frequency, session_id)    │
│    - Insert to measurements table                                   │
│    - Add 6 more fields                                              │
│    - **Wrap in array format**                                       │
│                                                                     │
│    Broadcasts 11 fields:                                            │
│    {                                                                │
│        "type": "new_data",                                          │
│        "data": [                      ← ARRAY wrapper               │
│            {                                                        │
│                "laptop_id": 1,         ← From camera                │
│                "dista": 5.234,         ← From camera                │
│                "distb": 3.456,         ← From camera                │
│                "is_a_detected": true,  ← From camera                │
│                "is_b_detected": true,  ← From camera                │
│                "session_id": 42,       ← From server/DB             │
│                "category": "baja",     ← From server/DB             │
│                "frequency": 1.5,       ← From server/DB             │
│                "relative_time": 15,    ← From server/DB             │
│                "elapsed_seconds": 15,  ← From server/DB             │
│                "timestamp": "2025..."  ← From server                │
│            }                                                        │
│        ]                                                            │
│    }                                                                │
└───────────────────────────┬─────────────────────────────────────────┘
                            ↓
            ┌───────────────┴───────────────┐
            ↓                               ↓
┌─────────────────────────┐    ┌────────────────────────────┐
│ 3a. ADMIN PAGE          │    │ 3b. USER PAGES             │
│  (admin_new_v3.js)      │    │  (tim_client_v3.js)        │
│                         │    │                            │
│  ws.onmessage receives  │    │  ws.onmessage receives     │
│  message.data (array)   │    │  message.data (array)      │
│                         │    │                            │
│  processNewData(        │    │  message.data.forEach(     │
│    message.data         │    │    item => {               │
│  )                      │    │      if (item.laptop_id    │
│  ↓                      │    │          === LAPTOP_ID)    │
│  message.data.forEach(  │    │        handleNewData(item) │
│    item => {            │    │    }                       │
│      // Process each    │    │  )                         │
│      // team's data     │    │  ↓                         │
│      if (itemCategory   │    │  Update charts for         │
│          === current)   │    │  this team only            │
│        updateChart()    │    │                            │
│    }                    │    │                            │
│  )                      │    │                            │
│  ↓                      │    │                            │
│  Update all 8 teams     │    │                            │
│  charts & stats table   │    │                            │
└─────────────────────────┘    └────────────────────────────┘
```

## Verification Steps

### 1. Check WebSocket Server Handler
File: `websocket_server.php` line ~88

```php
// Handle camera_data dari OpenCV (5 fields dari kamera)
if (isset($data['type']) && $data['type'] === 'camera_data') {
    echo "Received camera_data from laptop_id: {$data['laptop_id']}\n";
    
    // PROSES DATA: Tambahkan 6 fields lain dari server
    $enriched_data = $this->enrichCameraData($data);
    
    if ($enriched_data) {
        // Broadcast ke semua client (admin + user pages)
        $message = json_encode($enriched_data);
        foreach ($this->clients as $client) {
            $client->send($message);
        }
        
        echo "Broadcasted enriched data to " . count($this->clients) . " clients\n";
    }
    
    return;
}
```

✅ **Status:** Handler exists and calls `enrichCameraData()`

### 2. Check enrichCameraData Format
File: `websocket_server.php` line ~168-247

```php
private function enrichCameraData($camera_data) {
    // ... validation and DB operations ...
    
    // Return enriched data dalam format yang compatible dengan admin & user pages
    // Format: {type: 'new_data', data: [array of objects]}
    return [
        'type' => 'new_data',
        'data' => [                    // ✅ ARRAY WRAPPER
            [
                'laptop_id' => (int)$laptop_id,
                'dista' => (float)$camera_data['dista'],
                // ... 11 fields total ...
            ]
        ]
    ];
}
```

✅ **Status:** Returns correct array format

### 3. Check Admin Page Handler
File: `admin_new_v3.js` line 217-267

```javascript
function processNewData(newDataArray) {
    newDataArray.forEach(item => {     // ✅ Expects array
        const laptopId = item.laptop_id;
        const freq = parseFloat(item.frequency).toFixed(1);
        const itemCategory = item.category || currentCategory;
        
        // Filter by category
        if (itemCategory !== currentCategory) return;
        
        // Update data structure
        teamFreqData.dataA.push({
            time: relTime,
            value: parseFloat(item.dista || 0)
        });
        // ...
    });
}
```

✅ **Status:** Compatible - expects array, will work with single-item array

### 4. Check User Page Handler
File: `tim_client_v3.js` line 293-318

```javascript
if (message.type === 'new_data' && Array.isArray(message.data)) {
    message.data.forEach(item => {     // ✅ Expects array
        // Filter by laptop_id
        if (item.laptop_id === LAPTOP_ID) {
            // Update timer
            if (sessionActive && item.relative_time !== null) {
                const serverTime = Math.min(60, Math.floor(item.relative_time));
                if (Math.abs(serverTime - elapsedSeconds) > 2) {
                    elapsedSeconds = serverTime;
                }
            }
            
            // Update charts
            handleNewData(item);
        }
    });
}
```

✅ **Status:** Compatible - checks `Array.isArray()`, filters by `laptop_id`

## Testing Script

File: `test_ws_camera.py`

```bash
python test_ws_camera.py
```

Expected output:
```
======================================================================
  Test WebSocket Camera Integration
======================================================================

Connecting to ws://localhost:8080...
✓ Connected!

Sending test camera_data message...
✓ Sent: {
  "type": "camera_data",
  "laptop_id": 1,
  "dista": 5.234,
  "distb": 3.456,
  "is_a_detected": true,
  "is_b_detected": true
}

Waiting for broadcast response...
✓ Received broadcast:
{
  "type": "new_data",
  "data": [
    {
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
  ]
}

✓ Format correct: type=new_data, data is array
✓ Has 11 fields
  Fields: laptop_id, dista, distb, is_a_detected, is_b_detected, session_id, category, frequency, relative_time, elapsed_seconds, timestamp

======================================================================
  Test complete!
======================================================================
```

## Integration Test Checklist

Before using in production, verify:

- [ ] WebSocket server running (`php websocket_server.php`)
- [ ] Session started (admin click start or `curl start_new_session.php`)
- [ ] Test script runs successfully (`python test_ws_camera.py`)
- [ ] Admin page shows data in stats table
- [ ] User page (tim_X_v3.html) shows data in charts
- [ ] Database has new rows in `measurements` table
- [ ] Timer synchronizes on user page

## Files Modified

1. ✅ `websocket_server.php` - Fixed `enrichCameraData()` return format
   - Changed from flat object to `{type: 'new_data', data: [...]}`
   - Now compatible with admin & user page handlers

2. ✅ `test_ws_camera.py` - Created test script
   - Verifies message format
   - Checks array structure
   - Validates field count

## Summary

✅ **COMPATIBILITY CONFIRMED!**

Data dari kamera OpenCV via WebSocket akan **terdeteksi dengan benar** di website karena:

1. Server wraps data dalam array: `{type: 'new_data', data: [...]}`
2. Admin page expects array: `processNewData(message.data)` → `forEach()`
3. User page expects array: `message.data.forEach()` dengan filter `laptop_id`
4. Format 11 fields lengkap dan sesuai

**No code changes needed on frontend!** Admin & user pages sudah siap menerima data dari WebSocket camera sender. 🎉
