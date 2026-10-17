<#
.SYNOPSIS
  One-time move of the real data from the laptop's `local` database to Neon (B6.3).

.DESCRIPTION
  1. Dumps `local` (container librarian-db-1) to temp/backups/local-before-neon-<stamp>.dump
  2. Refuses to go on if the Neon database already has tables (never overwrites)
  3. Restores the dump (schema + data + Drizzle's migration table) into Neon's direct URL
  4. Prints row counts of both sides and fails if any differ

  Reads DIRECT_DATABASE_URL from .env.prod. Docker Desktop must be running.

    powershell -NoProfile -ExecutionPolicy Bypass -File C:\librarian\scripts\migrate-to-neon.ps1
#>
param(
	[string]$EnvFile = '',
	[string]$PgImage = 'postgres:18-alpine',
	[string]$Container = 'librarian-db-1'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$backupDir = Join-Path $root 'temp\backups'
New-Item -ItemType Directory -Force $backupDir | Out-Null
if (-not $EnvFile) { $EnvFile = Join-Path $root '.env.prod' }

$url = $null
foreach ($line in Get-Content $EnvFile) {
	if ($line -match '^\s*DIRECT_DATABASE_URL\s*=\s*(.*)$') { $url = $Matches[1].Trim().Trim('"').Trim("'") }
}
if (-not $url) { throw "DIRECT_DATABASE_URL is missing from $EnvFile" }

function Invoke-Checked([string]$what, [scriptblock]$block) {
	$out = & $block
	if ($LASTEXITCODE -ne 0) { throw "$what failed (exit $LASTEXITCODE)" }
	return $out
}

$countSql = "select 'series', count(*) from series union all select 'books', count(*) from books " +
	"union all select 'bookfairs', count(*) from bookfairs union all select 'reading', count(*) from reading " +
	"union all select 'tags', count(*) from tags union all select 'series_tags', count(*) from series_tags"
$mount = '{0}:/backups' -f ($backupDir -replace '\\', '/')

# 1. Dump local inside its container, then copy the file out (no binary piping through PowerShell)
$name = 'local-before-neon-{0}.dump' -f (Get-Date -Format 'yyyyMMdd-HHmm')
Invoke-Checked 'pg_dump local' { docker exec $Container pg_dump -Fc -U root -d local -f "/tmp/$name" }
Invoke-Checked 'docker cp' { docker cp "${Container}:/tmp/$name" (Join-Path $backupDir $name) }
Invoke-Checked 'cleanup' { docker exec $Container rm "/tmp/$name" }
Write-Output "Backed up local -> temp/backups/$name"

# 2. Never restore over existing data
$tables = Invoke-Checked 'checking Neon' {
	docker run --rm $PgImage psql $url -tAc "select count(*) from pg_tables where schemaname = 'public'"
}
if ([int]$tables -ne 0) { throw "Neon already has $tables table(s) in public - not restoring over them" }

# 3. Restore
Invoke-Checked 'pg_restore into Neon' {
	docker run --rm -v $mount $PgImage pg_restore --no-owner --no-acl --exit-on-error -d $url "/backups/$name"
}

# 4. Compare
$localCounts = Invoke-Checked 'counting local' { docker exec $Container psql -U root -d local -tAc $countSql }
$neonCounts = Invoke-Checked 'counting Neon' { docker run --rm $PgImage psql $url -tAc $countSql }
Write-Output ''
Write-Output ('{0,-12} {1,8} {2,8}' -f 'table', 'local', 'neon')
$same = $true
for ($i = 0; $i -lt $localCounts.Count; $i++) {
	$l = $localCounts[$i] -split '\|'
	$n = $neonCounts[$i] -split '\|'
	if ($l[1] -ne $n[1]) { $same = $false }
	Write-Output ('{0,-12} {1,8} {2,8}' -f $l[0], $l[1], $n[1])
}
if (-not $same) { throw 'Row counts differ' }
Write-Output "`nAll counts match."
