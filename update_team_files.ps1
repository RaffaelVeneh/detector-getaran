# Update tim_2 through tim_8 with correct team numbers
2..8 | ForEach-Object {
    $teamNum = $_
    $filePath = "c:\laragon\www\detector-getaran\tim_$($teamNum)_v3.html"
    
    # Read content
    $content = Get-Content $filePath -Raw
    
    # Replace Tim 1 with Tim X
    $content = $content -replace 'Tim 1 - Monitor', "Tim $teamNum - Monitor"
    $content = $content -replace "const LAPTOP_ID = 1;", "const LAPTOP_ID = $teamNum;"
    $content = $content -replace "const TEAM_NAME = 'Tim 1';", "const TEAM_NAME = 'Tim $teamNum';"
    $content = $content -replace 'Data real-time untuk Tim 1', "Data real-time untuk Tim $teamNum"
    
    # Save back
    Set-Content $filePath -Value $content -NoNewline
    Write-Host "✅ Updated tim_$($teamNum)_v3.html"
}

Write-Host ""
Write-Host "✅ All team files updated successfully!"
