<# Toggle Pillars (simplified) - ensure playit running and open the app

This simplified version avoids Add-Type/C# to keep the hotkey script robust.
It will ensure the playit client/service is running, then open the Pillars app URL in Edge.
If you want window hide/show toggle later, I can add a small native helper.
#>

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# Setup logging
$logDir = Join-Path $scriptPath 'db'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
$playitLog = Join-Path $logDir 'playit.log'
$toggleLog = Join-Path $logDir 'toggle_pillars.log'

function Write-Log([string]$file, [string]$msg) {
    $line = "$(Get-Date -Format o) $msg"
    Add-Content -Path $file -Value $line -ErrorAction SilentlyContinue
}

# Launch Pillars app (hotkey behavior - no Playit dependency)

# URL to open. When deployed to Fly, set environment variable PILLARS_URL or edit this value.
$APP_URL = $env:PILLARS_URL
if (-not $APP_URL -or $APP_URL.Trim() -eq '') { $APP_URL = 'http://localhost:5173' }

Write-Log $toggleLog "Launching Pillars app -> $APP_URL"
try {
    Start-Process "msedge" "--app=$APP_URL" -WindowStyle Normal
    Write-Log $toggleLog "Started Edge app for Pillars"
} catch {
    $err = $_.Exception.Message
    Write-Log $toggleLog "Failed to start Edge app: $err"
}
