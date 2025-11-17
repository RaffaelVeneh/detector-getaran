-- Migration: Update Team Order
-- Date: 2025-11-14
-- Description: Update team order for both BAJA and BETON categories

-- First, backup current data if needed
-- Then update the team assignments

-- ===========================
-- KATEGORI BAJA (8 Teams)
-- ===========================
-- 1. Universitas Udayana_abhipraya
UPDATE teams SET laptop_id = 1 WHERE category = 'baja' AND nama_tim LIKE '%Udayana%';

-- 2. Politeknik Negeri Semarang
UPDATE teams SET laptop_id = 2 WHERE category = 'baja' AND nama_tim LIKE '%Semarang%';

-- 3. Universitas Jember
UPDATE teams SET laptop_id = 3 WHERE category = 'baja' AND nama_tim LIKE '%Jember%';

-- 4. Politeknik Astra
UPDATE teams SET laptop_id = 4 WHERE category = 'baja' AND nama_tim LIKE '%Astra%';

-- 5. Institut Teknologi Sepuluh Nopember (ITS)
UPDATE teams SET laptop_id = 5 WHERE category = 'baja' AND nama_tim LIKE '%Sepuluh Nopember%';

-- 6. Institut Teknologi Nasional Malang
UPDATE teams SET laptop_id = 6 WHERE category = 'baja' AND nama_tim LIKE '%Nasional Malang%';

-- 7. Universitas Brawijaya
UPDATE teams SET laptop_id = 7 WHERE category = 'baja' AND nama_tim LIKE '%Brawijaya%';

-- 8. Universitas Negeri Malang
UPDATE teams SET laptop_id = 8 WHERE category = 'baja' AND nama_tim LIKE '%Negeri Malang%';

-- ===========================
-- KATEGORI BETON (8 Teams)
-- ===========================
-- 1. Politeknik Bandung
UPDATE teams SET laptop_id = 1 WHERE category = 'beton' AND nama_tim LIKE '%Bandung%';

-- 2. Universitas Warmadewa
UPDATE teams SET laptop_id = 2 WHERE category = 'beton' AND nama_tim LIKE '%Warmadewa%';

-- 3. Institut Teknologi Sepuluh Nopember (ITS)
UPDATE teams SET laptop_id = 3 WHERE category = 'beton' AND nama_tim LIKE '%Sepuluh Nopember%';

-- 4. Universitas Muhammadiyah Malang
UPDATE teams SET laptop_id = 4 WHERE category = 'beton' AND nama_tim LIKE '%Muhammadiyah%';

-- 5. Universitas Brawijaya
UPDATE teams SET laptop_id = 5 WHERE category = 'beton' AND nama_tim LIKE '%Brawijaya%';

-- 6. Universitas Negeri Yogyakarta
UPDATE teams SET laptop_id = 6 WHERE category = 'beton' AND nama_tim LIKE '%Yogyakarta%';

-- 7. Politeknik Negeri Malang
UPDATE teams SET laptop_id = 7 WHERE category = 'beton' AND nama_tim LIKE '%Politeknik Negeri Malang%';

-- 8. Universitas Negeri Jakarta
UPDATE teams SET laptop_id = 8 WHERE category = 'beton' AND nama_tim LIKE '%Jakarta%';

-- Verify the changes
SELECT laptop_id, category, nama_tim FROM teams ORDER BY category, laptop_id;
