-- =====================================================
-- MIGRATION: Insert Beton Teams + Add Category to Sessions
-- Date: November 10, 2025
-- =====================================================

USE db_detector_getaran;

-- =====================================================
-- 1. Add category column to sessions table
-- =====================================================
ALTER TABLE sessions 
ADD COLUMN category ENUM('baja', 'beton') DEFAULT 'baja' AFTER frequency;

-- =====================================================
-- 2. Insert 8 Beton teams
-- =====================================================
INSERT INTO teams (laptop_id, category, nama_tim) VALUES
(1, 'beton', 'Tim Omega 1'),
(2, 'beton', 'Tim Omega 2'),
(3, 'beton', 'Tim Omega 3'),
(4, 'beton', 'Tim Omega 4'),
(5, 'beton', 'Tim Omega 5'),
(6, 'beton', 'Tim Omega 6'),
(7, 'beton', 'Tim Omega 7'),
(8, 'beton', 'Tim Omega 8')
ON DUPLICATE KEY UPDATE nama_tim = VALUES(nama_tim);

-- =====================================================
-- 3. Update existing Baja team names to be more descriptive
-- =====================================================
UPDATE teams SET nama_tim = 'Tim Sigma 1' WHERE laptop_id = 1 AND category = 'baja';
UPDATE teams SET nama_tim = 'Tim Sigma 2' WHERE laptop_id = 2 AND category = 'baja';
UPDATE teams SET nama_tim = 'Tim Sigma 3' WHERE laptop_id = 3 AND category = 'baja';
UPDATE teams SET nama_tim = 'Tim Sigma 4' WHERE laptop_id = 4 AND category = 'baja';
UPDATE teams SET nama_tim = 'Tim Sigma 5' WHERE laptop_id = 5 AND category = 'baja';
UPDATE teams SET nama_tim = 'Tim Sigma 6' WHERE laptop_id = 6 AND category = 'baja';
UPDATE teams SET nama_tim = 'Tim Sigma 7' WHERE laptop_id = 7 AND category = 'baja';
UPDATE teams SET nama_tim = 'Tim Sigma 8' WHERE laptop_id = 8 AND category = 'baja';

SELECT '✅ Migration completed successfully!' as Status;
SELECT COUNT(*) as Total_Teams FROM teams;
SELECT category, COUNT(*) as Count FROM teams GROUP BY category;
