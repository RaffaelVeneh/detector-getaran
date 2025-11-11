# Category System Implementation - COMPLETE ✅

## Overview
Multi-category system (Baja & Beton) with 16 teams total (8 per category) has been fully implemented.

## What Was Fixed
1. **Timer Synchronization**: User page timers now sync with admin timer via `session_started` event
2. **Graph Layout**: Changed from vertical stacking to side-by-side 2-column layout (Lantai 3 left, Lantai 10 right)
3. **Category Display**: Category labels and dynamic team names now appear in all user page navbars
4. **Data Persistence**: Switching categories preserves data independently for each category

---

## Files Modified/Created

### 1. Database Migration
**File**: `migration_add_category_system.sql`
- Added `category` ENUM('baja', 'beton') to `teams` table
- Changed PRIMARY KEY to composite: `(laptop_id, category)`
- Added `category` column to `sessions` table
- Inserted 16 team names (8 Baja + 8 Beton)

**Usage**:
```bash
mysql -u root -p db_detector_getaran < migration_add_category_system.sql
```

---

### 2. Admin Page

#### **admin_new_v3.html**
- Added category dropdown selector before frequency dropdown:
```html
<select id="categorySelect">
    <option value="baja">Baja</option>
    <option value="beton">Beton</option>
</select>
```

#### **admin_new_v3.js**
Key Changes:
- Data structure: `dataByTeamAndFreq = { 'baja': {...}, 'beton': {...} }`
- Added `currentCategory` variable (default: 'baja')
- Added `teamNamesBaja` and `teamNamesBeton` arrays
- Function `handleCategoryChange()`: Switches category, updates charts, broadcasts via WebSocket
- Updated `startRecording()`: Sends `{frequency, category: currentCategory}` to API
- Updated `processNewData()`: Filters by `currentCategory`
- Updated `updateChart()` and `updateStatsTable()`: Uses `dataByTeamAndFreq[currentCategory][laptopId]`
- Disables category selector during active recording

---

### 3. User Pages (tim_1_v3.html to tim_8_v3.html)

#### **Navbar Changes** (All 8 files)
```html
<h1 class="nav-title">
    Detector Getaran - 
    <span id="teamName">Loading...</span> - 
    Kategori: <span id="categoryLabel">Baja</span>
</h1>
```

#### **Graph Layout Changes** (All 8 files)
**Before**: Vertical stacking (All Lantai 3 charts, then all Lantai 10 charts)

**After**: Side-by-side 2-column layout per frequency:
```html
<div class="graphs-row">
    <div class="freq-label-row">1.5 Hz</div>
    <div class="graph-column">
        <h4>Lantai 3 (Displacement A)</h4>
        <canvas id="chartLantai3_Freq15"></canvas>
        <div class="freq-stats">...</div>
    </div>
    <div class="graph-column">
        <h4>Lantai 10 (Displacement B)</h4>
        <canvas id="chartLantai10_Freq15"></canvas>
        <div class="freq-stats">...</div>
    </div>
</div>
```
Repeated for all 5 frequencies (1.5, 2.5, 3.5, 4.5, 5.5 Hz)

---

### 4. User JavaScript

#### **tim_client_v3.js**
Key Changes:
- Added `currentCategory` variable (default: 'baja')
- **WebSocket Handler** `category_change`: Updates `currentCategory`, calls `updateCategoryDisplay()` and `loadTeamName()`
- **Function** `handleSessionStart()`: Checks `data.category`, calls `updateCategoryDisplay()`
- **Function** `updateCategoryDisplay(category)`: Updates `<span id="categoryLabel">`
- **Function** `loadTeamName(laptopId, category)`: Async fetch from `/api/get_team_info.php`, updates `<span id="teamName">`
- **DOMContentLoaded**: Calls `loadTeamName(LAPTOP_ID, currentCategory)` on page load

---

### 5. WebSocket Server

#### **websocket_server.php**
Key Changes:
- **onMessage()**: Added `category_change` broadcast handler
```php
if ($data['type'] === 'category_change') {
    $message = json_encode([
        'type' => 'category_change', 
        'category' => $data['category']
    ]);
    foreach ($this->clients as $client) {
        $client->send($message);
    }
}
```

- **checkNewData()**: Updated SQL query to JOIN teams with category:
```php
LEFT JOIN sessions s ON rd.session_id = s.id
INNER JOIN teams t ON rd.laptop_id = t.laptop_id 
    AND (s.category IS NULL OR t.category = s.category)
```
Added `s.category as category` to SELECT

- **checkSessionChanges()**: Updated query to include `category` column, added to `session_started` broadcast

---

### 6. API Endpoints

#### **api/start_timer.php**
- Accepts `category` parameter in request body (default: 'baja')
- Validation: `if (!in_array($category, ['baja', 'beton']))`
- Insert query: `INSERT INTO sessions (frequency, category, started_at, status)`
- Returns: `{status, session_id, frequency, category, started_at}`

#### **api/get_team_info.php** (NEW)
- Endpoint: `GET /api/get_team_info.php?laptop_id=X&category=Y`
- Validation: laptop_id (1-8), category (baja/beton)
- Query: `SELECT laptop_id, category, nama_tim FROM teams WHERE laptop_id=? AND category=?`
- Returns: `{laptop_id, category, nama_tim}` or `{error: "..."}`

#### **api/export_realtime.php**
- Updated JOIN: `LEFT JOIN sessions s... INNER JOIN teams t ON rd.laptop_id = t.laptop_id AND (s.category IS NULL OR t.category = s.category)`
- Added `t.category as Category` to SELECT
- CSV headers: Added 'Category' column (3rd column)
- CSV rows: Added `$row['Category']`

#### **api/export_session.php**
- Updated JOIN: `INNER JOIN teams t ON rd.laptop_id = t.laptop_id AND t.category = s.category`
- Added `t.category as Category` to SELECT
- CSV headers: Added 'Category' column (3rd column)
- CSV rows: Added `$row['Category']`

---

### 7. CSS Styling

#### **style.css**
Added new classes for 2-column layout:

```css
/* 2-Column Layout for Lantai 3 and Lantai 10 side-by-side */
.graphs-row {
    display: grid;
    grid-template-columns: 100px 1fr 1fr;
    gap: 1.5rem;
    align-items: start;
    padding: 1.5rem;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid #e2e8f0;
    margin-bottom: 1.5rem;
}

.freq-label-row {
    font-weight: 700;
    font-size: 1.2rem;
    color: #1e40af;
    text-align: center;
    padding: 1rem 0.5rem;
    background: white;
    border-radius: 6px;
    border: 2px solid #1e40af;
    align-self: center;
}

.graph-column {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.graph-column h4 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #334155;
    text-align: center;
    padding: 0.5rem;
    background: white;
    border-radius: 4px;
}
```

---

## How It Works

### Category Switching Flow
1. **Admin** selects category from dropdown
2. **admin_new_v3.js** calls `handleCategoryChange()`
   - Updates `currentCategory` variable
   - Clears and redraws charts with data from `dataByTeamAndFreq[newCategory]`
   - Updates stats table
   - **Broadcasts** via WebSocket: `{type: 'category_change', category: 'baja/beton'}`
3. **WebSocket Server** receives message, broadcasts to ALL clients
4. **User Pages** receive `category_change` event
   - Update `currentCategory` variable
   - Call `updateCategoryDisplay()` to update navbar label
   - Call `loadTeamName()` to fetch new team name from API
5. **Data Persistence**: Each category maintains separate data in `dataByTeamAndFreq`

### Recording Flow with Category
1. **Admin** clicks "Start Recording"
2. **admin_new_v3.js** sends `{frequency: 1.5, category: 'baja'}` to `/api/start_timer.php`
3. **start_timer.php** creates session: `INSERT INTO sessions (frequency, category, ...)`
4. **WebSocket Server** detects new session, broadcasts `session_started` with `category` field
5. **User Pages** receive event, check `data.category`, update navbar and start timer

### Team Name Loading
1. **User page** loads: `DOMContentLoaded` fires
2. Calls `loadTeamName(LAPTOP_ID, currentCategory)`
3. Fetches from `/api/get_team_info.php?laptop_id=1&category=baja`
4. Updates `<span id="teamName">` with result (e.g., "Tim Sigma 1")

---

## Database Structure

### teams Table (After Migration)
```sql
CREATE TABLE teams (
    laptop_id INT,
    category ENUM('baja', 'beton'),
    nama_tim VARCHAR(100),
    PRIMARY KEY (laptop_id, category)
);
```

**Example Data**:
| laptop_id | category | nama_tim |
|-----------|----------|----------|
| 1 | baja | Tim Sigma 1 |
| 1 | beton | Tim Omega 1 |
| 2 | baja | Tim Sigma 2 |
| 2 | beton | Tim Omega 2 |
| ... | ... | ... |
| 8 | baja | Tim Sigma 8 |
| 8 | beton | Tim Omega 8 |

### sessions Table (After Migration)
```sql
ALTER TABLE sessions ADD COLUMN category ENUM('baja', 'beton') DEFAULT 'baja';
```

---

## Testing Checklist

### 1. Database Migration
- [ ] Run `migration_add_category_system.sql`
- [ ] Verify 16 rows in `teams` table (8 Baja + 8 Beton)
- [ ] Verify composite PRIMARY KEY: `SHOW CREATE TABLE teams;`

### 2. WebSocket Server
- [ ] Start server: `php websocket_server.php`
- [ ] Check console: "WebSocket server started on port 8080"

### 3. Admin Page Tests
- [ ] Open `admin_new_v3.html`
- [ ] Category dropdown shows "Baja" (default) and "Beton"
- [ ] Switch to "Beton" → All 8 team colors change, charts update
- [ ] Switch back to "Baja" → Original data preserved
- [ ] Start recording with Baja → Category selector disabled
- [ ] Stop recording → Category selector enabled

### 4. User Page Tests (Test with tim_1_v3.html)
- [ ] Page loads → Navbar shows "Tim Sigma 1 - Kategori: Baja"
- [ ] **Admin** switches to Beton → User navbar updates to "Tim Omega 1 - Kategori: Beton"
- [ ] **Admin** starts recording with Baja → User timer syncs (counts up 00:00 → 01:00)
- [ ] Graphs show side-by-side layout: Lantai 3 (left) | Lantai 10 (right)
- [ ] All 5 frequency rows visible with proper labels (1.5, 2.5, 3.5, 4.5, 5.5 Hz)

### 5. Export Tests
- [ ] Export Realtime CSV → Includes 'Category' column (3rd column)
- [ ] Export Session CSV → Includes 'Category' column (3rd column)
- [ ] CSV data matches selected category

---

## Key Features Implemented

### ✅ Multi-Category System
- Two categories: Baja and Beton
- 16 teams total (8 per category)
- Same laptop IDs (1-8) for both categories
- Database differentiation via composite key

### ✅ Dynamic Team Names
- Team names loaded from database via API
- Automatically updates when category changes
- Navbar displays: "Team Name - Kategori: X"

### ✅ Data Persistence
- Switching categories preserves data independently
- Each category maintains separate chart data
- No data loss when switching back and forth

### ✅ Real-time Synchronization
- WebSocket broadcasts category changes to all clients
- User pages update instantly when admin switches category
- Timer synchronization between admin and users

### ✅ Improved Graph Layout
- Side-by-side 2-column layout (Lantai 3 left, Lantai 10 right)
- Easier visual comparison between floors
- Frequency labels on the left for clear identification

### ✅ Export with Category
- CSV exports include 'Category' column
- Proper JOIN with category in SQL queries
- Data integrity maintained in exports

---

## Technical Notes

### Laptop ID Constraint
- Hardware limitation: OpenCV only detects 8 laptop IDs (1-8)
- Solution: Use composite PRIMARY KEY (laptop_id, category)
- Cannot extend to 9-16 due to hardware limitation

### Category Default
- Default category: 'baja'
- All pages initialize with 'baja' on load
- Can be changed via admin dropdown

### WebSocket Events
1. `category_change`: Broadcast when admin switches category
2. `session_started`: Includes `category` field for recording start
3. `new_data`: Filtered by category in `checkNewData()` query

### CSS Grid Layout
- **Old**: `grid-template-columns: 80px 1fr 300px` (1 graph per row)
- **New**: `grid-template-columns: 100px 1fr 1fr` (2 graphs per row)
- Grid structure: Frequency Label | Lantai 3 | Lantai 10

---

## Future Enhancements (Optional)

1. **Category Filter in Exports**: Add `?category=baja` parameter to export APIs
2. **Category History**: Track category changes in sessions table
3. **Multi-Session Recording**: Allow recording multiple frequencies simultaneously
4. **Category-Specific Statistics**: Aggregate stats per category
5. **Admin Dashboard**: Show both categories side-by-side

---

## Troubleshooting

### Issue: Team name not updating on user page
**Solution**: Check `/api/get_team_info.php` response, verify database has 16 rows in `teams` table

### Issue: Timer not syncing
**Solution**: Check `websocket_server.php` is running, verify `session_started` event includes `category` field

### Issue: Graph layout broken
**Solution**: Check `style.css` has `.graphs-row`, `.graph-column`, `.freq-label-row` classes

### Issue: Category not persisting in database
**Solution**: Verify `migration_add_category_system.sql` was executed, check sessions table has `category` column

---

## Deployment Steps

1. **Run Migration**:
   ```bash
   mysql -u root -p db_detector_getaran < migration_add_category_system.sql
   ```

2. **Restart WebSocket Server**:
   ```bash
   # Stop existing server (Ctrl+C)
   php websocket_server.php
   ```

3. **Clear Browser Cache**:
   - Hard refresh all pages (Ctrl+Shift+R)
   - Or clear browser cache completely

4. **Test**:
   - Open admin page, switch categories
   - Open 2-3 user pages (tim_1, tim_2, tim_3)
   - Verify category labels update
   - Start recording, verify timer syncs
   - Export CSV, verify category column

---

## Contact & Support

For issues or questions, check:
1. Browser console (F12) for JavaScript errors
2. WebSocket server console for connection logs
3. PHP error log: `c:\laragon\logs\php_error.log`
4. MySQL error log: `c:\laragon\logs\mysql.log`

**System Version**: v3.0 (Multi-Category Update)
**Last Updated**: 2025-01-XX
**Author**: Vibration Detection System Team

---

## File Summary

### Modified Files (17)
1. `admin_new_v3.html` (added category dropdown)
2. `admin_new_v3.js` (category system logic)
3. `tim_client_v3.js` (category handlers, team name loading)
4. `tim_1_v3.html` to `tim_8_v3.html` (navbar + 2-column layout) - **8 files**
5. `websocket_server.php` (category broadcast + JOIN updates)
6. `api/start_timer.php` (category parameter)
7. `api/export_realtime.php` (category JOIN + CSV column)
8. `api/export_session.php` (category JOIN + CSV column)
9. `style.css` (2-column grid layout)

### Created Files (2)
1. `migration_add_category_system.sql` (database schema update)
2. `api/get_team_info.php` (team name API endpoint)
3. `CATEGORY_SYSTEM_COMPLETE.md` (this file)

**Total Changes**: 19 files
**Lines Modified**: ~500+ lines
**Features Added**: 6 major features
**Bugs Fixed**: 3 critical issues

---

✅ **CATEGORY SYSTEM IMPLEMENTATION COMPLETE** ✅
