# Cloudflare Tunnel Setup Script
# This script will download cloudflared, authenticate, and create a tunnel

Write-Host "=== Cloudflare Tunnel Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if cloudflared is already installed
$cloudflaredPath = "C:\Windows\System32\cloudflared.exe"
$localCloudflared = "$PSScriptRoot\cloudflared.exe"

if (Test-Path $cloudflaredPath) {
    Write-Host "cloudflared found in System32" -ForegroundColor Green
    $cloudflared = $cloudflaredPath
} elseif (Test-Path $localCloudflared) {
    Write-Host "cloudflared found locally" -ForegroundColor Green
    $cloudflared = $localCloudflared
} else {
    Write-Host "Downloading cloudflared..." -ForegroundColor Yellow
    $downloadUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    try {
        Invoke-WebRequest -Uri $downloadUrl -OutFile $localCloudflared -UseBasicParsing
        Write-Host "cloudflared downloaded successfully!" -ForegroundColor Green
        $cloudflared = $localCloudflared
    } catch {
        Write-Host "Failed to download cloudflared: $_" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "=== Step 1: Login to Cloudflare ===" -ForegroundColor Cyan
Write-Host "This will open a browser window for authentication..."
Write-Host ""

# Login to Cloudflare
& $cloudflared tunnel login

if ($LASTEXITCODE -ne 0) {
    Write-Host "Login failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== Step 2: Create Tunnel ===" -ForegroundColor Cyan
$tunnelName = "pillars-tunnel"
Write-Host "Creating tunnel: $tunnelName" -ForegroundColor Yellow

& $cloudflared tunnel create $tunnelName

if ($LASTEXITCODE -ne 0) {
    Write-Host "Tunnel creation failed! It might already exist." -ForegroundColor Yellow
    Write-Host "Listing existing tunnels..." -ForegroundColor Yellow
    & $cloudflared tunnel list
}

Write-Host ""
Write-Host "=== Step 3: Get Tunnel Info ===" -ForegroundColor Cyan
& $cloudflared tunnel list

Write-Host ""
Write-Host "=== Next Steps ===" -ForegroundColor Cyan
Write-Host "1. Note your tunnel UUID from the list above" -ForegroundColor White
Write-Host "2. Create a config file (config.yml) with your tunnel settings" -ForegroundColor White
Write-Host "3. Route your domain to the tunnel" -ForegroundColor White
Write-Host "4. Run the tunnel with: cloudflared tunnel run $tunnelName" -ForegroundColor White
Write-Host ""
Write-Host "Would you like me to create a basic config file? (Y/N)" -ForegroundColor Yellow
