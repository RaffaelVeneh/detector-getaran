@echo off
echo ====================================
echo Verifikasi Urutan Tim Terbaru
echo ====================================
echo.

C:\laragon\bin\php\php-8.3.26-Win32-vs16-x64\php.exe -r "require 'db_config.php'; $result = $conn->query('SELECT laptop_id, category, nama_tim FROM teams ORDER BY category, laptop_id'); echo \"KATEGORI BAJA:\n\"; while ($row = $result->fetch_assoc()) { if ($row['category'] == 'baja') echo \"  {$row['laptop_id']}. {$row['nama_tim']}\n\"; } $result->data_seek(0); echo \"\\nKATEGORI BETON:\n\"; while ($row = $result->fetch_assoc()) { if ($row['category'] == 'beton') echo \"  {$row['laptop_id']}. {$row['nama_tim']}\n\"; }"

echo.
echo ====================================
pause
