<#
.SYNOPSIS
  Daily backup of the production database (Neon) to temp/backups/prod-<stamp>.dump.

.DESCRIPTION
  Reads DIRECT_DATABASE_URL (Neon's non-pooled URL) from .env.prod, runs pg_dump -Fc
  in a throwaway postgres container (no local Postgres install needed), checks the
  dump is readable (pg_restore --list), keeps the newest 14 and logs to backup.log.
  Docker Desktop must be running. Scheduled daily by Windows Task Scheduler:

    powershell -NoProfile -ExecutionPolicy Bypass -File C:\librarian\scripts\backup.ps1

  Restore into a scratch DB (never over production by accident):
    docker run --rm -v C:/librarian/temp/backups:/b postgres:16-alpine `
      pg_restore --no-owner --no-acl -d "<scratch url>" /b/prod-<stamp>.dump

.PARAMETER Keep
  How many prod-*.dump files to keep (default 14).

.PARAMETER EnvFile
  File holding DIRECT_DATABASE_URL (default: .env.prod in the repo root).

.PARAMETER PgImage
  Docker image for pg_dump; its major version must be >= the server's (default postgres:16-alpine).
#>
param(
	[int]$Keep = 14,
	[string]$EnvFile = '',
	[string]$PgImage = 'postgres:16-alpine'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$backupDir = Join-Path $root 'temp\backups'
$log = Join-Path $backupDir 'backup.log'
New-Item -ItemType Directory -Force $backupDir | Out-Null

function Write-Log([string]$message) {
	$line = '{0}  {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $message
	Add-Content -Path $log -Value $line -Encoding utf8
	Write-Output $line
}

function Read-EnvValue([string]$file, [string]$name) {
	if (-not (Test-Path $file)) { return $null }
	foreach ($line in Get-Content $file) {
		if ($line -match "^\s*$name\s*=\s*(.*)$") {
			return $Matches[1].Trim().Trim('"').Trim("'")
		}
	}
	return $null
}

try {
	if (-not $EnvFile) { $EnvFile = Join-Path $root '.env.prod' }
	$url = Read-EnvValue $EnvFile 'DIRECT_DATABASE_URL'
	if (-not $url) { throw "DIRECT_DATABASE_URL is missing from $EnvFile" }

	$name = 'prod-{0}.dump' -f (Get-Date -Format 'yyyyMMdd-HHmm')
	$mount = '{0}:/backups' -f ($backupDir -replace '\\', '/')

	# pg_dump writes the file itself: piping binary stdout through PowerShell 5.1 corrupts it
	& docker run --rm -v $mount $PgImage pg_dump -Fc --no-owner --no-acl -f "/backups/$name" $url
	if ($LASTEXITCODE -ne 0) { throw "pg_dump failed (exit $LASTEXITCODE)" }

	& docker run --rm -v $mount $PgImage pg_restore --list "/backups/$name" | Out-Null
	if ($LASTEXITCODE -ne 0) { throw "$name is not a readable dump (exit $LASTEXITCODE)" }

	$size = (Get-Item (Join-Path $backupDir $name)).Length
	Write-Log ("OK    {0} ({1:N0} KB)" -f $name, ($size / 1KB))

	# Keep the newest $Keep production dumps (manual local-*.dump files are left alone)
	Get-ChildItem $backupDir -Filter 'prod-*.dump' |
		Sort-Object Name -Descending |
		Select-Object -Skip $Keep |
		ForEach-Object {
			Remove-Item $_.FullName
			Write-Log "PRUNE $($_.Name)"
		}
	exit 0
}
catch {
	Write-Log "FAIL  $($_.Exception.Message)"
	exit 1
}
