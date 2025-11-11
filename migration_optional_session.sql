-- ============================================
-- Migration: Make Session Optional
-- Purpose: Allow data insertion without active session
-- Date: 2025-11-11
-- ============================================

USE db_detector_getaran;

-- Make session_id, frequency, and relative_time NULLABLE
ALTER TABLE realtime_data 
    MODIFY COLUMN session_id INT NULL,
    MODIFY COLUMN frequency DECIMAL(3,1) NULL,
    MODIFY COLUMN relative_time INT NULL;

-- Add index on timestamp for realtime export performance
-- (Skip if already exists - ignore error)
-- CREATE INDEX idx_timestamp ON realtime_data(timestamp);

-- Add index on laptop_id and timestamp for better query performance
-- (Skip if already exists - ignore error)
-- CREATE INDEX idx_laptop_timestamp ON realtime_data(laptop_id, timestamp);

-- Note: Indexes already exist from previous migration, skipping to avoid error

-- Verify changes
DESCRIBE realtime_data;

-- Test query: Get data without session (free mode)
SELECT laptop_id, dista, distb, timestamp 
FROM realtime_data 
WHERE session_id IS NULL 
LIMIT 5;

-- Test query: Get data with session (recording mode)
SELECT laptop_id, dista, distb, session_id, relative_time, timestamp 
FROM realtime_data 
WHERE session_id IS NOT NULL 
LIMIT 5;

COMMIT;
