-- =====================================================
-- MIGRATION: Add Category System (SIMPLIFIED)
-- Date: November 11, 2025
-- =====================================================

USE db_detector_getaran;

-- 1. Add category column to teams (if not exists)
ALTER TABLE teams 
ADD COLUMN IF NOT EXISTS category ENUM('baja', 'beton') DEFAULT 'baja' AFTER laptop_id;

-- 2. Add category column to sessions (if not exists)
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS category ENUM('baja', 'beton') DEFAULT 'baja' AFTER frequency;

-- 3. Delete existing teams data (we'll insert new structure)
TRUNCATE TABLE teams;

-- 4. INSERT team names for BAJA (laptop_id 1-8)
INSERT INTO teams (laptop_id, category, nama_tim) VALUES
(1, 'baja', 'Institut Teknologi Nasional Malang_TRISHA ABINAWA'),
(2, 'baja', 'Universitas Negeri Malang_Warock'),
(3, 'baja', 'Universitas Udayana_Abhipraya'),
(4, 'baja', 'Politeknik Negeri Semarang_Tim Seismastha'),
(5, 'baja', 'Institut Teknologi Sepuluh Nopember_Askara Team'),
(6, 'baja', 'Universitas Jember_Alvandaru Team'),
(7, 'baja', 'Universitas Brawijaya_SRIKANDI'),
(8, 'baja', 'Politeknik Astra_Astura Team');

-- 5. INSERT team names for BETON (laptop_id 1-8)
INSERT INTO teams (laptop_id, category, nama_tim) VALUES
(1, 'beton', 'Universitas Negeri Yogyakarta_Sahakarya'),
(2, 'beton', 'Politeknik Negeri Bandung_Wirajaya Palawiri'),
(3, 'beton', 'Politeknik Negeri Malang_Akral Baswara'),
(4, 'beton', 'Universitas Warmadewa_EL-BADAK Wanskuy'),
(5, 'beton', 'Universitas Muhammadiyah Malang_AKTARA'),
(6, 'beton', 'Institut Teknologi Sepuluh Nopember_Indestrukta Team'),
(7, 'beton', 'Universitas Negeri Jakarta_Astungkara'),
(8, 'beton', 'universitas Brawijaya_K-300');

-- 6. Verify data
SELECT '=== TEAMS DATA ===' as '';
SELECT category, laptop_id, nama_tim FROM teams ORDER BY category, laptop_id;

SELECT '=== TEAMS COUNT ===' as '';
SELECT category, COUNT(*) as count FROM teams GROUP BY category;
