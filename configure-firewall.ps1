# Configure Windows Firewall for Expo Dev Client
# Run this script as Administrator

Write-Host "Configuring Windows Firewall for Expo Dev Client..." -ForegroundColor Green

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

# Remove existing rules if they exist
Write-Host "Removing existing firewall rules (if any)..." -ForegroundColor Yellow
Remove-NetFirewallRule -DisplayName "Expo Dev Server" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "Metro Bundler" -ErrorAction SilentlyContinue
Remove-NetFirewallRule -DisplayName "Expo Dev Client" -ErrorAction SilentlyContinue

# Create new firewall rules
Write-Host "Creating firewall rule for Expo Dev Server (port 8081)..." -ForegroundColor Cyan
New-NetFirewallRule -DisplayName "Expo Dev Server" `
    -Direction Inbound `
    -LocalPort 8081 `
    -Protocol TCP `
    -Action Allow `
    -Profile Private,Domain `
    -Description "Allow Expo Dev Server connections on port 8081"

Write-Host "Creating firewall rule for Metro Bundler (port 8082)..." -ForegroundColor Cyan
New-NetFirewallRule -DisplayName "Metro Bundler" `
    -Direction Inbound `
    -LocalPort 8082 `
    -Protocol TCP `
    -Action Allow `
    -Profile Private,Domain `
    -Description "Allow Metro Bundler connections on port 8082"

Write-Host "Creating firewall rule for Expo Dev Client (port 19000-19001)..." -ForegroundColor Cyan
New-NetFirewallRule -DisplayName "Expo Dev Client" `
    -Direction Inbound `
    -LocalPort 19000-19001 `
    -Protocol TCP `
    -Action Allow `
    -Profile Private,Domain `
    -Description "Allow Expo Dev Client connections on ports 19000-19001"

Write-Host ""
Write-Host "✓ Firewall configuration complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Restart your terminal/PowerShell" -ForegroundColor White
Write-Host "2. cd north-mobile" -ForegroundColor White
Write-Host "3. npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "If you still have issues, try:" -ForegroundColor Yellow
Write-Host "  npm run dev:tunnel" -ForegroundColor White
Write-Host ""
