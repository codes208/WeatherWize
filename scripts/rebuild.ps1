<#
.SYNOPSIS
    WeatherWize - Full rebuild and run script for Windows PowerShell.

.DESCRIPTION
    Checks prerequisites (Node.js >= 18, npm, MySQL reachability),
    installs dependencies (including Sequelize, EJS, and Resend),
    initializes the database, and starts the Express server.

    The app uses:
      - Sequelize ORM with MySQL for all database access (models/)
      - EJS as the view engine for server-rendered pages (views/)
      - Express REST API for all weather, auth, alerts, and settings routes
      - Resend SDK for email alert notifications (requires RESEND_API_KEY in .env)
      - Alerts fire once then go inactive — user must re-enable from Alerts Manager

.PARAMETER Dev
    If specified, starts the server with nodemon for auto-reload during development.

.EXAMPLE
    .\scripts\rebuild.ps1
    .\scripts\rebuild.ps1 -Dev
#>

param(
    [switch]$Dev
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

function Write-Step {
    param([string]$Icon, [string]$Message, [string]$Color = "White")
    Write-Host "$Icon  " -NoNewline
    Write-Host $Message -ForegroundColor $Color
}

function Write-Fail {
    param([string]$Message)
    Write-Step "❌" $Message "Red"
}

function Write-Ok {
    param([string]$Message)
    Write-Step "✅" $Message "Green"
}

function Write-Info {
    param([string]$Message)
    Write-Step "⚙️" $Message "Cyan"
}

function Write-Warn {
    param([string]$Message)
    Write-Step "⚠️" $Message "Yellow"
}

# ─────────────────────────────────────────────────────────────
# Header
# ─────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkCyan
Write-Host "  WeatherWize - Rebuild and Run                   " -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkCyan
Write-Host ""

# ─────────────────────────────────────────────────────────────
# Step 1: Check Node.js
# ─────────────────────────────────────────────────────────────
Write-Info "Checking Node.js..."
try {
    $nodeVersion = & node --version 2>&1
    $versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
    if ($versionNumber -lt 18) {
        Write-Fail "Node.js v18+ is required (found $nodeVersion). Native fetch requires v18+."
        exit 1
    }
    Write-Ok "Node.js $nodeVersion detected"
} catch {
    Write-Fail "Node.js is not installed or not in PATH."
    Write-Host "       Install from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# ─────────────────────────────────────────────────────────────
# Step 2: Check npm
# ─────────────────────────────────────────────────────────────
Write-Info "Checking npm..."
try {
    $npmVersion = & npm --version 2>&1
    Write-Ok "npm v$npmVersion detected"
} catch {
    Write-Fail "npm is not installed or not in PATH."
    exit 1
}

# ─────────────────────────────────────────────────────────────
# Step 3: Parse .env
# ─────────────────────────────────────────────────────────────
$envFile = Join-Path $ProjectRoot ".env"
$dbHost = "localhost"
$dbPort = 3306
$serverPort = 3000

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*DB_HOST\s*=\s*(.+)$') { $script:dbHost = $Matches[1].Trim() }
        if ($_ -match '^\s*PORT\s*=\s*(\d+)')    { $script:serverPort = [int]$Matches[1] }
    }
    Write-Ok ".env loaded (DB_HOST=$dbHost, PORT=$serverPort)"

    $resendKey = ""
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*RESEND_API_KEY\s*=\s*(.+)$') { $resendKey = $Matches[1].Trim() }
    }
    if (-not $resendKey -or $resendKey -eq "your_resend_api_key_here") {
        Write-Warn "RESEND_API_KEY is not configured - email alerts will be skipped."
        Write-Host "       Set RESEND_API_KEY in .env to enable email notifications." -ForegroundColor Yellow
    } else {
        Write-Ok "RESEND_API_KEY is set"
    }
} else {
    Write-Warn "No .env file found - using defaults (localhost:3000)"
}

# ─────────────────────────────────────────────────────────────
# Step 4: Check MySQL reachability
# ─────────────────────────────────────────────────────────────
Write-Info "Checking MySQL reachability at ${dbHost}:${dbPort}..."
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $asyncResult = $tcp.BeginConnect($dbHost, $dbPort, $null, $null)
    $waitHandle = $asyncResult.AsyncWaitHandle
    $connected = $waitHandle.WaitOne(3000, $false)
    if ($connected) {
        $tcp.EndConnect($asyncResult)
        Write-Ok "MySQL server is reachable at ${dbHost}:${dbPort}"
    } else {
        Write-Fail "MySQL server is not reachable at ${dbHost}:${dbPort}."
        Write-Host "       Ensure MySQL is running and accepting connections." -ForegroundColor Yellow
        exit 1
    }
    $tcp.Close()
} catch {
    Write-Fail "MySQL server is not reachable at ${dbHost}:${dbPort}."
    Write-Host "       Ensure MySQL is running. Error: $($_.Exception.Message)" -ForegroundColor Yellow
    exit 1
}

# ─────────────────────────────────────────────────────────────
# Step 5: Install dependencies
# ─────────────────────────────────────────────────────────────
Write-Info "Installing dependencies (npm install)..."
Push-Location $ProjectRoot
try {
    & npm install 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "npm install failed."
        exit 1
    }
    Write-Ok "Dependencies installed successfully"
} catch {
    Write-Fail "npm install failed: $($_.Exception.Message)"
    exit 1
} finally {
    Pop-Location
}

# ─────────────────────────────────────────────────────────────
# Step 6: Initialize database
# ─────────────────────────────────────────────────────────────
Write-Info "Initializing database (node init-db.js)..."
Push-Location $ProjectRoot
try {
    $dbOutput = & node --no-deprecation init-db.js 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Fail "Database initialization failed."
        Write-Host $dbOutput -ForegroundColor Red
        exit 1
    }
    $dbOutput | ForEach-Object { Write-Host "       $_" -ForegroundColor DarkGray }
    Write-Ok "Database initialized successfully"
} catch {
    Write-Fail "Database initialization failed: $($_.Exception.Message)"
    exit 1
} finally {
    Pop-Location
}

# ─────────────────────────────────────────────────────────────
# Step 7: Kill existing process on port (if any)
# ─────────────────────────────────────────────────────────────
Write-Info "Checking for existing process on port $serverPort..."
$existingPid = $null
try {
    $netstatOutput = & netstat -ano 2>$null | Select-String "LISTENING" | Select-String ":$serverPort\s"
    if ($netstatOutput) {
        $existingPid = ($netstatOutput.ToString().Trim() -split '\s+')[-1]
    }
} catch { }

if ($existingPid -and $existingPid -ne '0') {
    Write-Warn "Port $serverPort is in use by PID $existingPid - killing it..."
    try {
        Stop-Process -Id ([int]$existingPid) -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 500
        Write-Ok "Previous process (PID $existingPid) terminated"
    } catch {
        Write-Fail "Could not kill PID $existingPid. Please close the process manually."
        exit 1
    }
} else {
    Write-Ok "Port $serverPort is available"
}

# ─────────────────────────────────────────────────────────────
# Step 8: Start server
# ─────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkCyan

Push-Location $ProjectRoot
if ($Dev) {
    Write-Info "Starting server in DEV mode (nodemon)..."
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkCyan
    Write-Host ""
    $env:NODE_OPTIONS = "--no-deprecation"
    & npx nodemon server.js
} else {
    Write-Info "Starting server..."
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkCyan
    Write-Host ""
    & node --no-deprecation server.js
}
Pop-Location
