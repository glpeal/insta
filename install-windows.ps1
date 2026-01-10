# Instagram DM Panel - PowerShell Installation Script for Windows
# Run as Administrator for best results

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "Instagram DM Panel - Windows Setup" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Check for admin rights
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if ($isAdmin) {
    Write-Host "✓ Running as Administrator" -ForegroundColor Green
} else {
    Write-Host "⚠ WARNING: Not running as Administrator" -ForegroundColor Yellow
    Write-Host "  Some operations may fail. Consider running as Administrator." -ForegroundColor Yellow
    Write-Host ""
}

# Stop Node.js processes
Write-Host "Step 1: Stopping any Node.js processes..." -ForegroundColor Cyan
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Navigate to script directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Backend setup
Write-Host "Step 2: Setting up backend..." -ForegroundColor Cyan
Set-Location backend

# Remove old files
if (Test-Path "node_modules") {
    Write-Host "  Removing node_modules..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
}

if (Test-Path "package-lock.json") {
    Write-Host "  Removing package-lock.json..." -ForegroundColor Yellow
    Remove-Item -Force "package-lock.json" -ErrorAction SilentlyContinue
}

# Clear npm cache
Write-Host "Step 3: Clearing npm cache..." -ForegroundColor Cyan
npm cache clean --force

# Verify package.json
Write-Host "Step 4: Verifying package.json..." -ForegroundColor Cyan
$packageJson = Get-Content "package.json" -Raw | ConvertFrom-Json

if ($packageJson.dependencies.sqlite3) {
    Write-Host "  ✓ package.json is correct (using sqlite3)" -ForegroundColor Green
} else {
    Write-Host "  ✗ ERROR: package.json missing sqlite3" -ForegroundColor Red
    Write-Host "  Please run 'git pull' to get latest changes" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Install dependencies
Write-Host ""
Write-Host "Step 5: Installing backend dependencies..." -ForegroundColor Cyan
Write-Host "  This may take 3-5 minutes..." -ForegroundColor Yellow
Write-Host ""

npm install --loglevel=error

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ Backend installation successful!" -ForegroundColor Green

    # Setup .env
    if (-not (Test-Path ".env")) {
        Write-Host ""
        Write-Host "Step 6: Creating .env file..." -ForegroundColor Cyan
        Copy-Item ".env.example" ".env"

        # Generate random encryption key
        $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
        $encryptionKey = -join ((1..32) | ForEach-Object { $chars[(Get-Random -Maximum $chars.Length)] })

        (Get-Content ".env") -replace 'change_this_to_random_32_char_key_for_production', $encryptionKey | Set-Content ".env"

        Write-Host "  ✓ .env file created with random encryption key" -ForegroundColor Green
    } else {
        Write-Host "  ℹ .env file already exists, skipping..." -ForegroundColor Yellow
    }

} else {
    Write-Host ""
    Write-Host "✗ Backend installation failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common solutions:" -ForegroundColor Yellow
    Write-Host "1. Run PowerShell as Administrator" -ForegroundColor White
    Write-Host "2. Close all programs that might be using Node.js files" -ForegroundColor White
    Write-Host "3. Temporarily disable antivirus" -ForegroundColor White
    Write-Host "4. Use WSL2 (recommended): wsl --install" -ForegroundColor White
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Frontend setup
Write-Host ""
Write-Host "Step 7: Setting up frontend..." -ForegroundColor Cyan
Set-Location ..\frontend

# Remove old files
if (Test-Path "node_modules") {
    Write-Host "  Removing node_modules..." -ForegroundColor Yellow
    Remove-Item -Recurse -Force "node_modules" -ErrorAction SilentlyContinue
}

if (Test-Path "package-lock.json") {
    Write-Host "  Removing package-lock.json..." -ForegroundColor Yellow
    Remove-Item -Force "package-lock.json" -ErrorAction SilentlyContinue
}

Write-Host "  Installing frontend dependencies..." -ForegroundColor Cyan
npm install --loglevel=error

if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Frontend installation successful!" -ForegroundColor Green
} else {
    Write-Host "  ✗ Frontend installation failed!" -ForegroundColor Red
}

# Final instructions
Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "✓ Installation Complete!" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Edit backend\.env with your settings" -ForegroundColor White
Write-Host ""
Write-Host "2. Start backend (in one terminal):" -ForegroundColor White
Write-Host "   cd backend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start frontend (in another terminal):" -ForegroundColor White
Write-Host "   cd frontend" -ForegroundColor Gray
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Open browser: http://localhost:3000" -ForegroundColor White
Write-Host ""
Write-Host "⚠ Important: Use at your own risk!" -ForegroundColor Yellow
Write-Host "   Instagram may ban accounts using automation." -ForegroundColor Yellow
Write-Host ""

Read-Host "Press Enter to exit"
