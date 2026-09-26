$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "GreenFlow Production Database Backup"
Write-Host "===================================="
Write-Host ""

# GreenFlow frontend directory is the parent of this scripts directory.
$frontendPath = Split-Path -Parent $PSScriptRoot

# Production environment file.
$environmentFile = Join-Path $frontendPath ".env.production.local"

# PostgreSQL backup tool.
$pgDumpPath = "C:\Program Files\PostgreSQL\18\bin\pg_dump.exe"

# Independent backup destination outside the Git repository.
$backupDirectory = Join-Path $env:USERPROFILE "OneDrive\GreenFlow Backups\Database"

# Backup log lives alongside the independent backups.
$logPath = Join-Path $backupDirectory "greenflow-backup.log"

# Keep successful GreenFlow Production database backups for 30 days.
$retentionDays = 30

function Write-BackupLog {
    param(
        [string]$Message
    )

    $logTimestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -Path $logPath -Value "$logTimestamp | $Message"
}

if (-not (Test-Path $environmentFile)) {
    Write-Host "BACKUP FAILED"
    Write-Host "Production environment file was not found."
    exit 1
}

if (-not (Test-Path $pgDumpPath)) {
    Write-Host "BACKUP FAILED"
    Write-Host "PostgreSQL 18 pg_dump.exe was not found."
    exit 1
}

if (-not (Test-Path $backupDirectory)) {
    Write-Host "BACKUP FAILED"
    Write-Host "GreenFlow backup directory was not found."
    exit 1
}

$dbLine = Get-Content $environmentFile |
    Where-Object { $_ -match '^DATABASE_URL=' } |
    Select-Object -First 1

if (-not $dbLine) {
    Write-Host "BACKUP FAILED"
    Write-Host "DATABASE_URL was not found in the production environment file."
    Write-BackupLog "FAILED | DATABASE_URL was not found."
    exit 1
}

$databaseUrl = ($dbLine -replace '^DATABASE_URL=', '').Trim().Trim('"')

if (-not $databaseUrl.Contains('.neon.tech')) {
    Write-Host "BACKUP FAILED"
    Write-Host "The production database URL does not appear to point to Neon."
    Write-BackupLog "FAILED | Production database URL did not pass the Neon safety check."
    $databaseUrl = $null
    exit 1
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupFileName = "greenflow-production_$timestamp.dump"
$backupPath = Join-Path $backupDirectory $backupFileName

Write-Host "Environment: Production"
Write-Host "Destination: $backupDirectory"
Write-Host "Backup file: $backupFileName"
Write-Host ""
Write-Host "Creating backup..."

Write-BackupLog "STARTED | $backupFileName"

try {
    & $pgDumpPath `
        --dbname="$databaseUrl" `
        --format=custom `
        --no-owner `
        --no-privileges `
        --file="$backupPath"

    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump exited with code $LASTEXITCODE."
    }

    if (-not (Test-Path $backupPath)) {
        throw "The backup file was not created."
    }

    $backupFile = Get-Item $backupPath

    if ($backupFile.Length -le 0) {
        throw "The backup file is empty."
    }

    Write-BackupLog "SUCCESS | $($backupFile.Name) | $($backupFile.Length) bytes"

    Write-Host ""
    Write-Host "BACKUP SUCCESSFUL"
    Write-Host "File: $($backupFile.Name)"
    Write-Host "Size: $($backupFile.Length) bytes"
    Write-Host "Created: $($backupFile.LastWriteTime)"

    # Retention runs only after a successful new backup.
    $retentionCutoff = (Get-Date).AddDays(-$retentionDays)

    $expiredBackups = @(
        Get-ChildItem $backupDirectory -File -Filter "greenflow-production_*.dump" |
            Where-Object {
                $_.LastWriteTime -lt $retentionCutoff -and
                $_.FullName -ne $backupFile.FullName
            }
    )

    if ($expiredBackups.Count -gt 0) {
        foreach ($expiredBackup in $expiredBackups) {
            Remove-Item $expiredBackup.FullName -Force

            Write-BackupLog "RETENTION | DELETED | $($expiredBackup.Name)"
        }

        Write-Host "Retention: deleted $($expiredBackups.Count) backup(s) older than $retentionDays days."
    }
    else {
        Write-Host "Retention: no backups older than $retentionDays days."
    }

    Write-Host ""
}
catch {
    if (Test-Path $backupPath) {
        Remove-Item $backupPath -Force -ErrorAction SilentlyContinue
    }

    Write-BackupLog "FAILED | $backupFileName | $($_.Exception.Message)"

    Write-Host ""
    Write-Host "BACKUP FAILED"
    Write-Host $_.Exception.Message
    Write-Host ""

    $databaseUrl = $null
    exit 1
}
finally {
    $databaseUrl = $null
    $dbLine = $null
}

exit 0