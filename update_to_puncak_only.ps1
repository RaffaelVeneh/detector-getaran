# Script untuk mengubah Lantai 3 & Lantai 10 menjadi Displacement Puncak saja
# Hapus Lantai 3, ubah Lantai 10 jadi Displacement Puncak

Write-Host "🔄 Updating template and team files..." -ForegroundColor Cyan

# Update template
Write-Host "📝 Updating tim_template_v3.html..."
$template = Get-Content "tim_template_v3.html" -Raw

# Ubah Lantai 10 jadi Displacement Puncak di semua tempat
$template = $template -replace 'Lantai 10 \(Displacement B\)', 'Displacement Puncak'
$template = $template -replace 'chartLantai10_', 'chartPuncak_'
$template = $template -replace 'realtime10_', 'realtimePuncak_'
$template = $template -replace 'max10_', 'maxPuncak_'
$template = $template -replace 'avg10_', 'avgPuncak_'

$template | Set-Content "tim_template_v3.html" -NoNewline

# Update semua tim files (tim_1 sampai tim_8)
for ($i = 1; $i -le 8; $i++) {
    $file = "tim_${i}_v3.html"
    Write-Host "📝 Updating $file..."
    
    $content = Get-Content $file -Raw
    
    # Ubah Lantai 10 jadi Displacement Puncak
    $content = $content -replace 'Lantai 10 \(Displacement B\)', 'Displacement Puncak'
    $content = $content -replace 'chartLantai10_', 'chartPuncak_'
    $content = $content -replace 'realtime10_', 'realtimePuncak_'
    $content = $content -replace 'max10_', 'maxPuncak_'
    $content = $content -replace 'avg10_', 'avgPuncak_'
    
    $content | Set-Content $file -NoNewline
}

Write-Host "✅ All files updated successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Summary:" -ForegroundColor Yellow
Write-Host "  - Lantai 10 renamed to: Displacement Puncak"
Write-Host "  - Chart IDs: chartPuncak_FreqXX"
Write-Host "  - Stats IDs: realtimePuncak_XX, maxPuncak_XX, avgPuncak_XX"
Write-Host ""
Write-Host "⚠️  Note: Lantai 3 HTML sections still exist but won't be used" -ForegroundColor Yellow
Write-Host "   JavaScript will only update Puncak charts"
