# Script to add Data Saving indicator to all user pages
Write-Host "🔄 Adding Data Saving indicator to user pages..." -ForegroundColor Cyan

$files = @(
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
        
        # Add Data Saving indicator after Timer section
        $pattern = '            <div class="session-info-item">\s+<label>Timer:</label>\s+<span class="timer-display-session" id="timerDisplay">00:00</span>\s+</div>\s+</section>'
        
        $replacement = '            <div class="session-info-item">
                <label>Timer:</label>
                <span class="timer-display-session" id="timerDisplay">00:00</span>
            </div>
            <div class="session-info-item">
                <label>Data Saving:</label>
                <span id="realtimeSavingStatus" style="font-weight: bold; color: #dc3545;">Tidak Aktif</span>
            </div>
        </section>'
        
        $content = $content -replace $pattern, $replacement
        
        $content | Set-Content $file -Encoding UTF8 -NoNewline
        
        Write-Host "✅ $file updated!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  $file not found!" -ForegroundColor Red
    }
}

Write-Host "`n✅ All user pages updated with Data Saving indicator!" -ForegroundColor Green
