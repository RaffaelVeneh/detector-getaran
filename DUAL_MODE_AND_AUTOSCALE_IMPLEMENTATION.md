# Dual-Mode Data Collection & Chart Auto-Scale Implementation

## Overview
Implemented two major features:
1. **Dual-Mode Data Collection**: Data can be accepted WITHOUT requiring admin to start recording session
2. **Chart Auto-Scale**: Charts automatically expand to accommodate large displacement values (e.g., 131mm)

Date: 2024-01-XX
Status: ✅ Code Complete | ⏳ Testing Pending

---

## Feature 1: Dual-Mode Data Collection

### Problem
Camera script could only send data AFTER admin started recording session. This required coordination between devices and meant data was lost during setup/preparation phases.

### Solution
Make session optional - data can be accepted in two modes:
- **Recording Mode**: WITH active session (session_id, category, frequency, relative_time)
- **Free Mode**: WITHOUT session (NULL for session fields, timestamp only)

### Changes Made

#### 1. Database Migration (`migration_optional_session.sql`)
```sql
-- Make session fields nullable
ALTER TABLE realtime_data 
    MODIFY COLUMN session_id INT NULL,
    MODIFY COLUMN frequency DECIMAL(3,1) NULL,
    MODIFY COLUMN relative_time INT NULL;

-- Add indexes for performance
CREATE INDEX idx_timestamp ON realtime_data(timestamp);
CREATE INDEX idx_laptop_timestamp ON realtime_data(laptop_id, timestamp);
```

**Status**: ⏳ File created, NOT YET EXECUTED
**Action Required**: Run migration on database before testing

#### 2. API Update (`api/receive_camera_data.php`)

**Session Check Logic**:
```php
// OLD: Reject if no session
if ($result->num_rows === 0) {
    http_response_code(400);
    echo json_encode(["error" => "No active session"]);
    exit;
}

// NEW: Optional session with dual mode
if ($result->num_rows > 0) {
    // Recording mode: use session data
    $session_id = $session['id'];
    $category = $session['category'];
    $frequency = $session['frequency'];
    $relative_time = $interval;
    $session_mode = true;
} else {
    // Free mode: use defaults with NULL
    $session_id = NULL;
    $category = 'baja';  // Default category
    $frequency = NULL;
    $relative_time = NULL;
    $session_mode = false;
}
```

**Team Name Fallback**:
```php
// OLD: Exit with 404 if team not found
if ($team_result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(["error" => "Team not found"]);
    exit;
}

// NEW: Use default name
if ($team_result->num_rows === 0) {
    $nama_tim = "Team $laptop_id";
    error_log("Team not found for laptop_id $laptop_id, using default name");
}
```

**Database Insert**:
```php
// Updated bind_param to allow NULL
$stmt->bind_param('iddiiidis', 
    $session_id,      // Can be NULL
    $laptop_id,
    $dista,
    $distb,
    $is_a_detected,
    $is_b_detected,
    $frequency,       // Can be NULL
    $relative_time,   // Can be NULL
    $timestamp
);
```

**Response with Mode**:
```json
{
    "success": true,
    "mode": "recording",  // or "free"
    "data_id": 12345,
    "nama_tim": "Team Kuning",
    "message": "Data received successfully"
}
```

### Data Flow

**Free Mode** (No Active Session):
```
Camera → receive_camera_data.php
         ↓ No active session found
         ↓ session_id = NULL
         ↓ frequency = NULL  
         ↓ relative_time = NULL
         ↓ category = 'baja' (default)
         ↓ timestamp = NOW()
         ↓ INSERT into realtime_data
         ↓ Broadcast via WebSocket
         → User/Admin pages (graphs update)
```

**Recording Mode** (Active Session):
```
Camera → receive_camera_data.php
         ↓ Active session found
         ↓ session_id = 123
         ↓ frequency = 1.5 Hz
         ↓ relative_time = 0-60s
         ↓ category = 'beton'
         ↓ timestamp = NOW()
         ↓ INSERT into realtime_data
         ↓ Broadcast via WebSocket
         → User/Admin pages (graphs update)
```

### Export Behavior

**Export Realtime** (`api/export_realtime.php`):
- Filters by: `timestamp` range
- Includes: ALL data (free mode + recording mode)
- Use case: Download all collected data by date/time

**Export Session** (`api/export_session.php`):
- Filters by: `session_id`
- Includes: ONLY recording mode data
- Excludes: Free mode data (session_id IS NULL)
- Use case: Download specific test session (60s recording)

### Continuous Operation

Camera script (`refactor_aruco.py`) behavior:
```
1. Script starts → Free mode (sends data, server accepts with mode="free")
2. Admin starts recording → Recording mode (sends data, server accepts with mode="recording")
3. Recording ends (60s) → Free mode (sends data, server accepts with mode="free")
4. Admin starts new recording → Recording mode
5. Script NEVER needs restart
```

Statistics track both modes:
```python
stats = {
    'total_sent': 150,
    'success': 120,        # Accepted in both modes
    'error_400': 0,        # Should be 0 now (no rejection)
    'error_timeout': 10,
    'error_connection': 20
}
```

---

## Feature 2: Chart Auto-Scale

### Problem
Charts had fixed scale of -500mm to +500mm. When displacement reached 131mm, it appeared tiny on the graph, making it hard to read and analyze.

### Solution
Change from fixed scale to auto-scale with suggested range:
- **Suggested Range**: -200mm to +200mm (flexible starting point)
- **Grace**: 10% padding beyond data range
- **Auto-Adjust**: Chart expands automatically for larger values
- **Smart Ticks**: Auto-skip and max limit for clean Y-axis

### Changes Made

#### 1. User Page Charts (`tim_client_v3.js`)

**OLD Configuration** (Lines 70-95):
```javascript
y: {
    type: 'linear',
    min: -500,  // FIXED minimum
    max: 500,   // FIXED maximum
    ticks: {
        stepSize: 200,
        font: { size: 13 },
        padding: 8,
        callback: function(value, index, values) {
            // Custom callback for fixed range
            return value.toFixed(0) + ' mm';
        }
    }
}
```

**NEW Configuration**:
```javascript
y: {
    type: 'linear',
    suggestedMin: -200,  // SUGGESTED (flexible)
    suggestedMax: 200,   // SUGGESTED (flexible)
    ticks: {
        autoSkip: true,        // Smart tick placement
        maxTicksLimit: 11,     // Max 11 ticks on Y-axis
        font: { size: 13 },
        padding: 8,
        callback: function(value) {
            return value.toFixed(0) + ' mm';
        }
    },
    title: {
        display: true,
        text: 'Displacement (mm)',
        font: { size: 13, weight: 'bold' }
    },
    grid: {
        color: 'rgba(0, 0, 0, 0.1)',
        lineWidth: 1,
        drawBorder: true,
        borderColor: 'rgba(0, 0, 0, 0.3)',
        borderWidth: 2
    },
    beginAtZero: true,    // Include zero in range
    grace: '10%'          // 10% padding for visibility
}
```

#### 2. Admin Page Chart (`admin_new_v3.js`)

**Similar Changes** (Lines 294-340):
- Changed `min`/`max` to `suggestedMin`/`suggestedMax`
- Added `autoSkip: true` and `maxTicksLimit: 11`
- Added `beginAtZero: true` and `grace: '10%'`
- Preserved special grid styling (Y=0 line thicker and dashed)

**Grid Styling Preserved**:
```javascript
grid: {
    color: function(context) {
        // Y=0 line darker
        if (context.tick.value === 0) {
            return 'rgba(0, 0, 0, 0.3)';
        }
        return 'rgba(0, 0, 0, 0.1)';
    },
    lineWidth: function(context) {
        // Y=0 line thicker
        if (context.tick.value === 0) {
            return 2;
        }
        return 1;
    },
    borderDash: function(context) {
        // Y=0 line dashed
        if (context.tick.value === 0) {
            return [5, 5];
        }
        return [];
    }
}
```

### Auto-Scale Behavior

**Example 1: Small Values** (-50mm to +80mm):
```
Chart Range: -200mm to +200mm (uses suggested range)
Y-axis ticks: -200, -160, -120, -80, -40, 0, 40, 80, 120, 160, 200
Grace padding: ±10% beyond suggested range if needed
```

**Example 2: Medium Values** (-150mm to +180mm):
```
Chart Range: -200mm to +220mm (expands max to fit data + 10% grace)
Y-axis ticks: -200, -160, -120, -80, -40, 0, 40, 80, 120, 160, 200
Grace padding: Added at top for 180mm data
```

**Example 3: Large Values** (-80mm to +131mm):
```
Chart Range: -200mm to +144mm (expands max to fit 131mm + 10% grace)
Y-axis ticks: Smart auto-skip with max 11 ticks
Grace padding: 131mm + 10% = ~144mm
```

**Example 4: Very Large Values** (-500mm to +800mm):
```
Chart Range: -550mm to +880mm (fully expands beyond suggested)
Y-axis ticks: Auto-skip adjusts (e.g., every 200mm)
Grace padding: ±10% beyond actual data range
```

### Benefits

1. **Better Visibility**: Data always fills reasonable portion of chart
2. **Automatic Adjustment**: No manual config needed for different ranges
3. **Smart Ticks**: Y-axis labels adjust density based on range
4. **Backward Compatible**: Small values still look good
5. **Performance**: No impact on render speed

---

## Testing Checklist

### Phase 1: Database Migration
- [ ] Execute `migration_optional_session.sql` on database
- [ ] Verify columns nullable: `DESCRIBE realtime_data;`
- [ ] Verify indexes created: `SHOW INDEX FROM realtime_data;`

### Phase 2: Free Mode Testing
- [ ] Start camera script (`python refactor_aruco.py`)
- [ ] Do NOT start recording on admin page
- [ ] Camera sends data successfully
- [ ] API responds with `"mode": "free"`
- [ ] Data appears in user/admin graphs
- [ ] Check database: `session_id`, `frequency`, `relative_time` are NULL
- [ ] Check database: `timestamp` is filled
- [ ] Verify data appears in Realtime Export
- [ ] Verify data excluded from Session Export

### Phase 3: Recording Mode Testing
- [ ] Keep camera script running
- [ ] Admin starts recording (select category + frequency)
- [ ] API responds with `"mode": "recording"`
- [ ] Data appears in graphs with session info
- [ ] Check database: `session_id`, `frequency`, `relative_time` filled
- [ ] Recording ends after 60 seconds
- [ ] Camera auto-switches back to free mode
- [ ] Verify data appears in Session Export

### Phase 4: Chart Auto-Scale Testing
- [ ] Generate small displacement data (-50 to +80mm)
- [ ] Verify chart uses suggested range (-200 to +200mm)
- [ ] Generate medium displacement data (-150 to +180mm)
- [ ] Verify chart expands max to fit data
- [ ] Generate large displacement data (131mm)
- [ ] Verify chart expands with 10% grace padding
- [ ] Check Y-axis ticks are readable (not too dense)
- [ ] Verify Y=0 line visible and styled correctly (admin page)

### Phase 5: Continuous Operation Testing
- [ ] Run camera script for extended period (30+ minutes)
- [ ] Start/stop multiple recording sessions
- [ ] Verify no memory leaks
- [ ] Check statistics accuracy
- [ ] Verify WebSocket broadcast works in both modes
- [ ] Monitor database growth rate

### Phase 6: Export Function Testing
- [ ] Export Realtime: Include date range with both modes
- [ ] Verify free mode data present in export
- [ ] Verify recording mode data present in export
- [ ] Export Session: Select specific session
- [ ] Verify only recording mode data in export
- [ ] Verify free mode data excluded

---

## Debug Commands

### Database Queries

**Check Data Distribution**:
```sql
SELECT 
    COUNT(CASE WHEN session_id IS NULL THEN 1 END) as free_mode_count,
    COUNT(CASE WHEN session_id IS NOT NULL THEN 1 END) as recording_mode_count,
    COUNT(*) as total
FROM realtime_data;
```

**Recent Free Mode Data**:
```sql
SELECT laptop_id, dista, distb, timestamp, 'FREE' as mode
FROM realtime_data
WHERE session_id IS NULL
ORDER BY timestamp DESC
LIMIT 10;
```

**Recent Recording Mode Data**:
```sql
SELECT laptop_id, dista, distb, session_id, relative_time, timestamp, 'RECORDING' as mode
FROM realtime_data
WHERE session_id IS NOT NULL
ORDER BY timestamp DESC
LIMIT 10;
```

**Check Specific Session**:
```sql
SELECT 
    laptop_id,
    dista,
    distb,
    relative_time,
    timestamp
FROM realtime_data
WHERE session_id = 123
ORDER BY relative_time ASC;
```

### Browser Console (User Page)

**Check Chart Scale**:
```javascript
// View current min/max
console.log('Chart Y-axis range:', 
    myChart.scales.y.min, 
    myChart.scales.y.max
);

// View actual data range
const allValues = [
    ...dataByFreq['1.5'].dataA.map(d => d.value),
    ...dataByFreq['1.5'].dataB.map(d => d.value),
    ...dataByFreq['2.0'].dataA.map(d => d.value),
    ...dataByFreq['2.0'].dataB.map(d => d.value)
];
console.log('Data range:', 
    Math.min(...allValues), 
    Math.max(...allValues)
);
```

**Force Chart Update**:
```javascript
myChart.update();  // Recalculate scale
```

### Python Console (Camera Script)

**View Statistics**:
```python
# In refactor_aruco.py DataSender class
print(f"""
Total Sent: {self.stats['total_sent']}
Success: {self.stats['success']}
Error 400: {self.stats['error_400']}  # Should be 0 with dual-mode
Timeout: {self.stats['error_timeout']}
Connection: {self.stats['error_connection']}
Success Rate: {self.stats['success'] / self.stats['total_sent'] * 100:.1f}%
""")
```

### PHP Error Log

**Monitor API Mode Switches**:
```bash
# In receive_camera_data.php, add:
error_log("Data accepted in " . ($session_mode ? "RECORDING" : "FREE") . " mode");

# Tail log:
tail -f c:\laragon\logs\php_error.log | grep "Data accepted"
```

---

## Known Limitations

### Dual-Mode System

1. **Free Mode Data Accumulation**:
   - Free mode data has no automatic cleanup
   - Could grow large over time
   - Consider: Cleanup job for data older than X days

2. **Category in Free Mode**:
   - Defaults to 'baja'
   - Cannot be changed without active session
   - Consider: Allow category selection without full session

3. **Export Realtime Performance**:
   - Large date ranges with free mode data could be slow
   - Consider: Add pagination or max result limit

### Chart Auto-Scale

1. **Initial Empty State**:
   - Chart starts with suggested range (-200 to +200)
   - May look odd until first data arrives
   - Consider: Show "Waiting for data..." message

2. **Rapid Scale Changes**:
   - With high-frequency data, scale may jump frequently
   - Could be disorienting for users
   - Consider: Add scale animation or stabilization

3. **Very Large Outliers**:
   - Single outlier could cause entire chart to rescale
   - Consider: Add outlier detection/filtering

---

## Migration Path

### Immediate (Before Testing)

1. **Backup Database**:
   ```bash
   mysqldump -u root -p detector_getaran > backup_before_migration.sql
   ```

2. **Run Migration**:
   ```bash
   mysql -u root -p detector_getaran < migration_optional_session.sql
   ```

3. **Verify Migration**:
   ```sql
   DESCRIBE realtime_data;
   -- Check: session_id, frequency, relative_time show NULL=YES
   
   SHOW INDEX FROM realtime_data;
   -- Check: idx_timestamp and idx_laptop_timestamp exist
   ```

### Testing Phase

1. Test free mode thoroughly
2. Test recording mode thoroughly
3. Test mode switching
4. Test both export functions
5. Test chart auto-scale with various data ranges

### Rollback (If Needed)

**Revert Database**:
```sql
ALTER TABLE realtime_data 
    MODIFY COLUMN session_id INT NOT NULL,
    MODIFY COLUMN frequency DECIMAL(3,1) NOT NULL,
    MODIFY COLUMN relative_time INT NOT NULL;

DROP INDEX idx_timestamp ON realtime_data;
DROP INDEX idx_laptop_timestamp ON realtime_data;
```

**Revert API** (`receive_camera_data.php`):
- Restore from backup: `backup/receive_camera_data.php.backup`
- Or: Manually revert to session-required logic

**Revert Charts**:
- `tim_client_v3.js`: Restore from `backup/tim_client_v3.js`
- `admin_new_v3.js`: Restore from `backup/admin_new_v3.js`

---

## Success Criteria

### Dual-Mode System
✅ Camera script runs without admin interaction
✅ Data accepted in both free and recording modes
✅ API responds with correct mode in response
✅ Database correctly stores NULL vs filled session fields
✅ Export Realtime includes all data
✅ Export Session includes only recording data
✅ WebSocket broadcast works in both modes
✅ No 400 errors in camera script statistics

### Chart Auto-Scale
✅ Charts expand for large values (131mm clearly visible)
✅ Charts don't look empty for small values
✅ Y-axis ticks readable and appropriately spaced
✅ Y=0 line visible and styled (admin page)
✅ No performance issues during updates
✅ Grace padding provides visual breathing room

---

## Support & Troubleshooting

### Issue: Migration Fails with Foreign Key Error
**Symptom**: `Cannot change column: used in a foreign key constraint`
**Solution**: 
```sql
-- Temporarily disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;
-- Run migration
ALTER TABLE realtime_data MODIFY COLUMN session_id INT NULL;
-- Re-enable checks
SET FOREIGN_KEY_CHECKS = 1;
```

### Issue: Camera Shows "Waiting for active session" Every Second
**Symptom**: Console spam with 400 error messages
**Solution**: 
- Database migration not yet run
- Run `migration_optional_session.sql`
- Restart camera script

### Issue: Charts Look "Zoomed Out" After Update
**Symptom**: All data appears very small on Y-axis
**Solution**: 
- This is normal for small displacement values
- Chart uses suggested range (-200 to +200mm)
- Will auto-expand when larger values arrive
- Or: Adjust `suggestedMin`/`suggestedMax` in code

### Issue: Free Mode Data Not in Export
**Symptom**: Export shows less data than expected
**Solution**:
- Check which export type you're using
- Export Realtime: Should include free mode
- Export Session: Excludes free mode (by design)
- Use correct export for your needs

### Issue: Chart Y-axis Jumps Frequently
**Symptom**: Y-axis scale changes rapidly with new data
**Solution**:
- Normal behavior with auto-scale
- To stabilize: Increase `suggestedMin`/`suggestedMax` range
- Or: Reduce `grace` percentage (e.g., '5%' instead of '10%')
- Or: Add min/max bounds if needed

---

## Next Steps

1. ✅ **Code Implementation**: Complete
2. ⏳ **Database Migration**: Pending execution
3. ⏳ **Unit Testing**: Pending
4. ⏳ **Integration Testing**: Pending  
5. ⏳ **User Acceptance**: Pending
6. ⏳ **Documentation Update**: Pending
7. ⏳ **Deployment**: Pending

---

## Files Modified

### Created:
- `migration_optional_session.sql` - Database migration script

### Modified:
- `api/receive_camera_data.php` - Dual-mode data acceptance logic
- `tim_client_v3.js` - Chart auto-scale for user pages
- `admin_new_v3.js` - Chart auto-scale for admin page

### To Backup Before Testing:
- `api/receive_camera_data.php` → `backup/receive_camera_data.php.backup`
- Database → `backup_before_migration.sql`

---

**Implementation Date**: 2024-01-XX
**Author**: GitHub Copilot
**Version**: 1.0
**Status**: Ready for Testing
