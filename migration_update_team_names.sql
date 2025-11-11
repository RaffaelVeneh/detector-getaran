-- =====================================================
-- MIGRATION: Update Team Names (Baja & Beton)
-- Date: November 10, 2025
-- =====================================================

USE db_detector_getaran;

-- =====================================================
-- Update BAJA Teams
-- =====================================================
UPDATE teams SET nama_tim = 'Institut Teknologi Nasional Malang_TRISHA ABINAWA' 
WHERE laptop_id = 1 AND category = 'baja';

UPDATE teams SET nama_tim = 'Universitas Negeri Malang_Warock' 
WHERE laptop_id = 2 AND category = 'baja';

UPDATE teams SET nama_tim = 'Universitas Udayana_Abhipraya' 
WHERE laptop_id = 3 AND category = 'baja';

UPDATE teams SET nama_tim = 'Politeknik Negeri Semarang_Tim Seismastha' 
WHERE laptop_id = 4 AND category = 'baja';

UPDATE teams SET nama_tim = 'Institut Teknologi Sepuluh Nopember_Askara Team' 
WHERE laptop_id = 5 AND category = 'baja';

UPDATE teams SET nama_tim = 'Universitas Jember_Alvandaru Team' 
WHERE laptop_id = 6 AND category = 'baja';

UPDATE teams SET nama_tim = 'Universitas Brawijaya_SRIKANDI' 
WHERE laptop_id = 7 AND category = 'baja';

UPDATE teams SET nama_tim = 'Politeknik Astra_Astura Team' 
WHERE laptop_id = 8 AND category = 'baja';

-- =====================================================
-- Update BETON Teams
-- =====================================================
UPDATE teams SET nama_tim = 'Universitas Negeri Yogyakarta_Sahakarya' 
WHERE laptop_id = 1 AND category = 'beton';

UPDATE teams SET nama_tim = 'Politeknik Negeri Bandung_Wirajaya Palawiri' 
WHERE laptop_id = 2 AND category = 'beton';

UPDATE teams SET nama_tim = 'Politeknik Negeri Malang_Akral Baswara' 
WHERE laptop_id = 3 AND category = 'beton';

UPDATE teams SET nama_tim = 'Universitas Warmadewa_EL-BADAK Wanskuy' 
WHERE laptop_id = 4 AND category = 'beton';

UPDATE teams SET nama_tim = 'Universitas Muhammadiyah Malang_AKTARA' 
WHERE laptop_id = 5 AND category = 'beton';

UPDATE teams SET nama_tim = 'Institut Teknologi Sepuluh Nopember_Indestrukta Team' 
WHERE laptop_id = 6 AND category = 'beton';

UPDATE teams SET nama_tim = 'Universitas Negeri Jakarta_Astungkara' 
WHERE laptop_id = 7 AND category = 'beton';

UPDATE teams SET nama_tim = 'Universitas Brawijaya_K-300' 
WHERE laptop_id = 8 AND category = 'beton';

-- =====================================================
-- Verification
-- =====================================================
SELECT '✅ Team names updated successfully!' as Status;
SELECT laptop_id, category, nama_tim FROM teams ORDER BY category, laptop_id;
