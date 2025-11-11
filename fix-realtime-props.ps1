$content = Get-Content 'tests\integration\realtime-sync.test.tsx' -Raw
$content = $content -replace '\s*isRealtimeConnected=\{(?:true|false)\}', ''
$content | Set-Content 'tests\integration\realtime-sync.test.tsx' -NoNewline
Write-Host "Fixed realtime-sync.test.tsx - removed isRealtimeConnected props"
