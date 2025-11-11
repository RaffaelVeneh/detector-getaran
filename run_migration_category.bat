@echo off
echo ========================================
echo Running Category System Migration
echo ========================================
echo.

REM Ganti path MySQL sesuai instalasi Laragon Anda
set MYSQL_PATH=C:\laragon\bin\mysql\mysql-8.0.30-winx64\bin\mysql.exe

REM Jalankan migration
"%MYSQL_PATH%" -u root -p < migration_add_category_system.sql

echo.
echo ========================================
echo Migration Complete!
echo ========================================
echo.
echo Struktur database telah diupdate:
echo - Tabel teams: Added column 'category'
echo - Tabel sessions: Added column 'category'
echo - Data teams: 16 rows (8 Baja + 8 Beton)
echo.
pause
