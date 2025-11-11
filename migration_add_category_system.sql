-- =====================================================
-- MIGRATION: Add Category System (Baja/Beton)
-- Date: November 10, 2025
-- =====================================================

USE db_detector_getaran;

-- =====================================================
-- 1. ALTER TABLE teams - Add category column
-- =====================================================
-- Check if category column already exists, if not add it
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'db_detector_getaran' 
    AND TABLE_NAME = 'teams' 
    AND COLUMN_NAME = 'category');

-- Add category column if it doesn't exist
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE teams ADD COLUMN category ENUM(''baja'', ''beton'') DEFAULT ''baja'' AFTER laptop_id',
    'SELECT ''Category column already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop existing UNIQUE constraint on laptop_id if it exists
SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = 'db_detector_getaran' 
    AND TABLE_NAME = 'teams' 
    AND INDEX_NAME = 'laptop_id');

SET @sql = IF(@index_exists > 0,
    'ALTER TABLE teams DROP INDEX laptop_id',
    'SELECT ''Index laptop_id does not exist'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add UNIQUE constraint on (laptop_id, category)
SET @unique_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = 'db_detector_getaran' 
    AND TABLE_NAME = 'teams' 
    AND INDEX_NAME = 'unique_laptop_category');

SET @sql = IF(@unique_exists = 0,
    'ALTER TABLE teams ADD UNIQUE KEY unique_laptop_category (laptop_id, category)',
    'SELECT ''Unique constraint already exists'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 2. ALTER TABLE sessions - Add category column
-- =====================================================
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'db_detector_getaran' 
    AND TABLE_NAME = 'sessions' 
    AND COLUMN_NAME = 'category');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE sessions ADD COLUMN category ENUM(''baja'', ''beton'') DEFAULT ''baja'' AFTER frequency',
    'SELECT ''Category column already exists in sessions'' as message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- =====================================================
-- 3. DELETE existing teams data (we'll insert new structure)
-- =====================================================
TRUNCATE TABLE teams;

-- =====================================================
-- 4. INSERT team names for BAJA (laptop_id 1-8)
-- =====================================================
INSERT INTO teams (laptop_id, category, nama_tim) VALUES
(1, 'baja', 'Institut Teknologi Nasional Malang_TRISHA ABINAWA'),
(2, 'baja', 'Universitas Negeri Malang_Warock'),
(3, 'baja', 'Universitas Udayana_Abhipraya'),
(4, 'baja', 'Politeknik Negeri Semarang_Tim Seismastha'),
(5, 'baja', 'Institut Teknologi Sepuluh Nopember_Askara Team'),
(6, 'baja', 'Universitas Jember_Alvandaru Team'),
(7, 'baja', 'Universitas Brawijaya_SRIKANDI'),
(8, 'baja', 'Politeknik Astra_Astura Team');

-- =====================================================
-- 5. INSERT team names for BETON (laptop_id 1-8)
-- =====================================================
INSERT INTO teams (laptop_id, category, nama_tim) VALUES
(1, 'beton', 'Universitas Negeri Yogyakarta_Sahakarya'),
(2, 'beton', 'Politeknik Negeri Bandung_Wirajaya Palawiri'),
(3, 'beton', 'Politeknik Negeri Malang_Akral Baswara'),
(4, 'beton', 'Universitas Warmadewa_EL-BADAK Wanskuy'),
(5, 'beton', 'Universitas Muhammadiyah Malang_AKTARA'),
(6, 'beton', 'Institut Teknologi Sepuluh Nopember_Indestrukta Team'),
(7, 'beton', 'Universitas Negeri Jakarta_Astungkara'),
(8, 'beton', 'universitas Brawijaya_K-300');

-- =====================================================
-- 6. Verify data
-- =====================================================
SELECT * FROM teams ORDER BY category, laptop_id;

-- =====================================================
-- Expected result: 16 rows
-- 8 rows with category='baja'
-- 8 rows with category='beton'
-- =====================================================
