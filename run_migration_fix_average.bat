@echo off
echo ========================================
echo FIX AVERAGE CALCULATION - Migration
echo ========================================
echo.
echo Problem: Average dihitung SUM / waktu (SALAH!)
echo Solution: Average dihitung AVG() = SUM / COUNT (BENAR!)
echo.
echo Akan mengupdate:
echo 1. Stored procedure update_statistics
echo 2. Table statistics comment
echo 3. Frontend sudah fixed (admin_new_v3.js: mm/s -^> mm)
echo.
pause

cd /d C:\laragon\www\detector-getaran

echo.
echo Running migration...
C:\laragon\bin\mysql\mysql-8.4.3-winx64\bin\mysql.exe -u root -p < migration_fix_average_calculation.sql

echo.
echo ========================================
echo Migration Complete!
echo ========================================
echo.
echo Changes applied:
echo - Stored procedure: update_statistics (fixed AVG calculation)
echo - Database comments updated
echo - Frontend labels: mm/s -^> mm
echo.
echo Next: Refresh halaman admin untuk lihat perubahan!
echo.
pause
