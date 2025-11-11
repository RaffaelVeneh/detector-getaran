-- ========================================
-- MIGRATION: Fix Average Calculation
-- ========================================
-- Problem: Average dihitung dengan SUM / waktu (salah!)
-- Solution: Average dihitung dengan AVG() = SUM / COUNT (benar!)
-- Date: 2025-11-11
-- ========================================

USE db_detector_getaran;

-- 1. Drop stored procedure lama
DROP PROCEDURE IF EXISTS update_statistics;

-- 2. Create stored procedure baru dengan calculation yang benar
DELIMITER //

CREATE PROCEDURE update_statistics(IN p_session_id INT, IN p_laptop_id INT)
BEGIN
    DECLARE v_max_dista DECIMAL(10,4);
    DECLARE v_max_distb DECIMAL(10,4);
    DECLARE v_avg_dista DECIMAL(10,4);
    DECLARE v_avg_distb DECIMAL(10,4);
    
    -- Hitung max displacement
    SELECT 
        MAX(ABS(dista)),
        MAX(ABS(distb))
    INTO v_max_dista, v_max_distb
    FROM realtime_data
    WHERE session_id = p_session_id AND laptop_id = p_laptop_id;
    
    -- Hitung average displacement (mm)
    -- Average = SUM / COUNT (bukan SUM / waktu)
    -- Semua data dihitung (tidak ada filter > 2mm)
    SELECT 
        IFNULL(AVG(ABS(dista)), 0),
        IFNULL(AVG(ABS(distb)), 0)
    INTO v_avg_dista, v_avg_distb
    FROM realtime_data
    WHERE session_id = p_session_id 
      AND laptop_id = p_laptop_id;
    
    -- Insert or update statistics
    INSERT INTO statistics (session_id, laptop_id, max_dista, max_distb, avg_dista, avg_distb)
    VALUES (p_session_id, p_laptop_id, v_max_dista, v_max_distb, v_avg_dista, v_avg_distb)
    ON DUPLICATE KEY UPDATE
        max_dista = v_max_dista,
        max_distb = v_max_distb,
        avg_dista = v_avg_dista,
        avg_distb = v_avg_distb;
END //

DELIMITER ;

-- 3. Update comment di table statistics
ALTER TABLE statistics 
    MODIFY COLUMN avg_dista DECIMAL(10,4) DEFAULT 0 COMMENT 'mm (average displacement)',
    MODIFY COLUMN avg_distb DECIMAL(10,4) DEFAULT 0 COMMENT 'mm (average displacement)';

-- 4. Recalculate semua statistics yang ada untuk session aktif
-- (Opsional - jalankan manual jika perlu)
-- CALL update_statistics(1, 1);  -- Contoh: session_id=1, laptop_id=1

SELECT '✅ Migration completed: Average calculation fixed!' as status;
SELECT 'Average sekarang = AVG(displacement) dalam satuan mm' as info;
SELECT 'Frontend labels sudah diupdate: mm/s → mm' as frontend_status;
