-- ===============================================
-- DATABASE DETECTOR GETARAN MEJA GETAR
-- Universitas Negeri Yogyakarta
-- ===============================================

-- Buat database jika belum ada
CREATE DATABASE IF NOT EXISTS `db_detector_getaran` 
DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Gunakan database
USE `db_detector_getaran`;

-- TABEL 1: teams (Data Tim Pengujian)
CREATE TABLE IF NOT EXISTS `teams` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nama_tim` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nama_tim` (`nama_tim`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABEL 2: test_sessions (Sesi Pengujian per Tim)
CREATE TABLE IF NOT EXISTS `test_sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `team_id` int(11) NOT NULL,
  `frekuensi_ke` int(11) NOT NULL DEFAULT 1 COMMENT '1-5',
  `started_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `finished_at` timestamp NULL DEFAULT NULL,
  `status` enum('running','completed','stopped') DEFAULT 'running',
  PRIMARY KEY (`id`),
  KEY `team_id` (`team_id`),
  KEY `frekuensi_ke` (`frekuensi_ke`),
  CONSTRAINT `test_sessions_ibfk_1` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- TABEL 3: test_data (History Data Pengujian)
-- Menyimpan snapshot data dari data.json per detik
CREATE TABLE IF NOT EXISTS `test_data` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `session_id` int(11) NOT NULL,
  `team_id` int(11) NOT NULL,
  `frekuensi_ke` int(11) NOT NULL,
  `waktu_detik` decimal(10,2) NOT NULL COMMENT 'Detik ke berapa dalam sesi (0-60)',
  `g3t_displacement` decimal(10,3) DEFAULT NULL COMMENT 'Displacement Gedung 3 Tingkat (mm)',
  `g3t_max_disp` decimal(10,3) DEFAULT NULL COMMENT 'Max Displacement G3T sampai saat ini (mm)',
  `g3t_avg_disp` decimal(10,3) DEFAULT NULL COMMENT 'Avg Displacement G3T (mm/s)',
  `g10t_displacement` decimal(10,3) DEFAULT NULL COMMENT 'Displacement Gedung 10 Tingkat (mm)',
  `g10t_max_disp` decimal(10,3) DEFAULT NULL COMMENT 'Max Displacement G10T sampai saat ini (mm)',
  `g10t_avg_disp` decimal(10,3) DEFAULT NULL COMMENT 'Avg Displacement G10T (mm/s)',
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `session_id` (`session_id`),
  KEY `team_id` (`team_id`),
  KEY `frekuensi_ke` (`frekuensi_ke`),
  CONSTRAINT `test_data_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `test_sessions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `test_data_ibfk_2` FOREIGN KEY (`team_id`) REFERENCES `teams` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- INSERT DATA CONTOH (OPTIONAL)
INSERT INTO `teams` (`nama_tim`) VALUES 
('Tim A - Teknik Sipil'),
('Tim B - Teknik Mesin'),
('Tim C - Fisika Terapan')
ON DUPLICATE KEY UPDATE nama_tim=nama_tim;

-- VIEWS untuk kemudahan query

-- View untuk melihat semua sesi dengan nama tim
CREATE OR REPLACE VIEW `v_test_sessions` AS
SELECT 
    s.id,
    s.team_id,
    t.nama_tim,
    s.frekuensi_ke,
    s.started_at,
    s.finished_at,
    s.status,
    TIMESTAMPDIFF(SECOND, s.started_at, COALESCE(s.finished_at, NOW())) as duration_seconds
FROM test_sessions s
JOIN teams t ON s.team_id = t.id
ORDER BY s.started_at DESC;

-- View untuk melihat data lengkap dengan info tim
CREATE OR REPLACE VIEW `v_test_data_complete` AS
SELECT 
    d.id,
    d.session_id,
    d.team_id,
    t.nama_tim,
    d.frekuensi_ke,
    d.waktu_detik,
    d.g3t_displacement,
    d.g3t_max_disp,
    d.g3t_avg_disp,
    d.g10t_displacement,
    d.g10t_max_disp,
    d.g10t_avg_disp,
    d.timestamp
FROM test_data d
JOIN teams t ON d.team_id = t.id
ORDER BY d.timestamp DESC;