-- ===== DATABASE SCHEMA V2 - SISTEM DETECTOR GETARAN =====
-- Drop database jika sudah ada (HATI-HATI!)
-- DROP DATABASE IF EXISTS db_detector_getaran;

-- Buat database baru
CREATE DATABASE IF NOT EXISTS db_detector_getaran;
USE db_detector_getaran;

-- ===== TABEL TEAMS (8 Tim Tetap) =====
CREATE TABLE teams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    laptop_id INT UNIQUE NOT NULL,
    nama_tim VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_laptop_id (laptop_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Insert 8 tim default
INSERT INTO teams (laptop_id, nama_tim) VALUES
(1, 'Tim 1'),
(2, 'Tim 2'),
(3, 'Tim 3'),
(4, 'Tim 4'),
(5, 'Tim 5'),
(6, 'Tim 6'),
(7, 'Tim 7'),
(8, 'Tim 8');

-- ===== TABEL SESSIONS (Recording Start/Stop) =====
CREATE TABLE sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    frequency DECIMAL(3,1) NOT NULL COMMENT 'Frekuensi: 1.5, 2.5, 3.5, 4.5, 5.5',
    started_at TIMESTAMP NULL,
    stopped_at TIMESTAMP NULL,
    status ENUM('running', 'stopped', 'completed') DEFAULT 'running',
    duration_seconds INT DEFAULT 0 COMMENT 'Durasi rekam (detik)',
    auto_stopped BOOLEAN DEFAULT FALSE COMMENT 'True jika auto-stop di 60 detik',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_frequency (frequency),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== TABEL REALTIME_DATA (Data dari OpenCV) =====
CREATE TABLE realtime_data (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NULL COMMENT 'NULL jika timer belum start',
    laptop_id INT NOT NULL,
    dista DECIMAL(10,4) NOT NULL COMMENT 'Displacement gedung lantai 3 (mm)',
    distb DECIMAL(10,4) NOT NULL COMMENT 'Displacement gedung lantai 10 (mm)',
    is_a_detected BOOLEAN DEFAULT FALSE,
    is_b_detected BOOLEAN DEFAULT FALSE,
    frequency DECIMAL(3,1) NOT NULL,
    timestamp TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3),
    relative_time DECIMAL(6,3) NULL COMMENT 'Waktu relatif dari start (detik)',
    INDEX idx_session (session_id),
    INDEX idx_laptop (laptop_id),
    INDEX idx_frequency (frequency),
    INDEX idx_timestamp (timestamp),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (laptop_id) REFERENCES teams(laptop_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== TABEL STATISTICS (Cache untuk Max/Avg per Session) =====
CREATE TABLE statistics (
    id INT PRIMARY KEY AUTO_INCREMENT,
    session_id INT NOT NULL,
    laptop_id INT NOT NULL,
    max_dista DECIMAL(10,4) DEFAULT 0,
    max_distb DECIMAL(10,4) DEFAULT 0,
    avg_dista DECIMAL(10,4) DEFAULT 0 COMMENT 'mm/s',
    avg_distb DECIMAL(10,4) DEFAULT 0 COMMENT 'mm/s',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_session_laptop (session_id, laptop_id),
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (laptop_id) REFERENCES teams(laptop_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ===== VIEW untuk Query Cepat =====
-- View: Data terbaru per tim
CREATE VIEW v_latest_data AS
SELECT 
    t.laptop_id,
    t.nama_tim,
    rd.dista,
    rd.distb,
    rd.frequency,
    rd.timestamp,
    s.id as session_id,
    s.status as session_status
FROM realtime_data rd
INNER JOIN teams t ON rd.laptop_id = t.laptop_id
LEFT JOIN sessions s ON rd.session_id = s.id
WHERE rd.id IN (
    SELECT MAX(id) 
    FROM realtime_data 
    GROUP BY laptop_id
);

-- View: Statistik per session
CREATE VIEW v_session_statistics AS
SELECT 
    s.id as session_id,
    s.frequency,
    s.started_at,
    s.stopped_at,
    s.duration_seconds,
    t.laptop_id,
    t.nama_tim,
    st.max_dista,
    st.max_distb,
    st.avg_dista,
    st.avg_distb
FROM sessions s
CROSS JOIN teams t
LEFT JOIN statistics st ON s.id = st.session_id AND t.laptop_id = st.laptop_id
WHERE s.status IN ('stopped', 'completed')
ORDER BY s.id DESC, t.laptop_id ASC;

-- ===== STORED PROCEDURE untuk Update Statistics =====
DELIMITER //

CREATE PROCEDURE update_statistics(IN p_session_id INT, IN p_laptop_id INT)
BEGIN
    DECLARE v_max_dista DECIMAL(10,4);
    DECLARE v_max_distb DECIMAL(10,4);
    DECLARE v_avg_dista DECIMAL(10,4);
    DECLARE v_avg_distb DECIMAL(10,4);
    DECLARE v_duration DECIMAL(10,3);
    
    -- Hitung max displacement
    SELECT 
        MAX(ABS(dista)),
        MAX(ABS(distb))
    INTO v_max_dista, v_max_distb
    FROM realtime_data
    WHERE session_id = p_session_id AND laptop_id = p_laptop_id;
    
    -- Hitung average displacement (mm/s)
    SELECT 
        IFNULL(MAX(relative_time), 1)
    INTO v_duration
    FROM realtime_data
    WHERE session_id = p_session_id AND laptop_id = p_laptop_id;
    
    SELECT 
        IFNULL(SUM(ABS(dista)) / v_duration, 0),
        IFNULL(SUM(ABS(distb)) / v_duration, 0)
    INTO v_avg_dista, v_avg_distb
    FROM realtime_data
    WHERE session_id = p_session_id 
      AND laptop_id = p_laptop_id
      AND ABS(dista) > 2 OR ABS(distb) > 2; -- Hanya hitung simpangan > 2mm
    
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

-- ===== TRIGGER untuk Auto-update Statistics =====
DELIMITER //

CREATE TRIGGER after_insert_realtime_data
AFTER INSERT ON realtime_data
FOR EACH ROW
BEGIN
    IF NEW.session_id IS NOT NULL THEN
        CALL update_statistics(NEW.session_id, NEW.laptop_id);
    END IF;
END //

DELIMITER ;

-- ===== Setup Selesai =====
SELECT 'Database v2 berhasil dibuat!' as status;
