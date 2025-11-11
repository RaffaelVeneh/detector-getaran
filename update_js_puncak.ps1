# Script untuk update JavaScript - hapus Lantai 3, hanya pakai Puncak (distb)

Write-Host "🔄 Updating JavaScript files..." -ForegroundColor Cyan

# Update tim_client_v3.js
Write-Host "📝 Updating tim_client_v3.js..."
$js = Get-Content "tim_client_v3.js" -Raw

# Ubah nama variabel dan ID
$js = $js -replace 'chartLantai10_', 'chartPuncak_'
$js = $js -replace 'realtime10_', 'realtimePuncak_'
$js = $js -replace 'max10_', 'maxPuncak_'
$js = $js -replace 'avg10_', 'avgPuncak_'

# Hapus semua pemanggilan updateChart untuk Lantai 3 (yang pakai 'A')
# Ganti dengan comment atau hapus baris yang ada chartsLantai3
$js = $js -replace "updateChart\(chartsLantai3\[freq\], freq, 'A'\);", "// Lantai 3 removed"

$js | Set-Content "tim_client_v3.js" -NoNewline

Write-Host "✅ tim_client_v3.js updated!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Changes:" -ForegroundColor Yellow
Write-Host "  - Lantai 10 chart IDs renamed to: chartPuncak_FreqXX"
Write-Host "  - Stats IDs renamed to: realtimePuncak_XX, maxPuncak_XX, avgPuncak_XX"
Write-Host "  - Lantai 3 updateChart() calls commented out"
Write-Host ""
Write-Host "✅ Done! Refresh browser to see changes." -ForegroundColor Green
