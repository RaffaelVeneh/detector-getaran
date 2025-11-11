# Script to remove Lantai 3 section from all user pages (tim_1 to tim_8)
Write-Host "🔄 Removing Lantai 3 from all user pages..." -ForegroundColor Cyan

# Array of team files
$files = @(
    "tim_1_v3.html",
    "tim_2_v3.html",
    "tim_3_v3.html",
    "tim_4_v3.html",
    "tim_5_v3.html",
    "tim_6_v3.html",
    "tim_7_v3.html",
    "tim_8_v3.html"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "📝 Processing $file..." -ForegroundColor Yellow
        
        $content = Get-Content $file -Raw -Encoding UTF8
        
        # Replace two-column wrapper with single-column and remove entire Lantai 3 section
        # This regex finds from "graphs-two-column-wrapper" start to just before "<!-- Kolom Kanan: Lantai 10 -->"
        $pattern = '        <!-- Graphs Section - 2 Kolom Grid -->\s*<div class="graphs-two-column-wrapper">\s*<!-- Kolom Kiri: Lantai 3 -->[\s\S]*?<!-- Kolom Kanan: Lantai 10 -->\s*<section class="graphs-section-multi">'
        $replacement = '        <!-- Graphs Section - Single Column -->' + "`n" + '        <div class="graphs-single-column-wrapper">' + "`n" + '            <section class="graphs-section-multi">'
        
        $content = $content -replace $pattern, $replacement
        
        # Save the file
        $content | Set-Content $file -Encoding UTF8 -NoNewline
        
        Write-Host "✅ $file updated!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  $file not found, skipping..." -ForegroundColor Red
    }
}

Write-Host "`n✅ All user pages updated successfully!" -ForegroundColor Green
Write-Host "- Lantai 3 section completely removed" -ForegroundColor White
Write-Host "- Changed to single-column layout for Displacement Puncak only" -ForegroundColor White
