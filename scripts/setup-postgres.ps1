# Creates edustream DB/user and applies Drizzle schema.
# Run from repo root: .\scripts\setup-postgres.ps1
param(
  [string]$PostgresPassword,
  [string]$DbName = "edustream",
  [string]$DbUser = "edustream",
  [string]$DbPassword = "ElimuPawa_Dev_2026!"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$Psql = "C:\Program Files\PostgreSQL\18\bin\psql.exe"
if (-not (Test-Path $Psql)) {
  $Psql = Get-ChildItem "C:\Program Files\PostgreSQL\*\bin\psql.exe" -ErrorAction SilentlyContinue |
    Select-Object -First 1 -ExpandProperty FullName
}
if (-not $Psql) {
  throw "psql not found. Install PostgreSQL 16+ or set Psql path manually."
}

if (-not $PostgresPassword) {
  $secure = Read-Host "Enter PostgreSQL password for user 'postgres'" -AsSecureString
  $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try { $PostgresPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

$env:PGPASSWORD = $PostgresPassword

Write-Host "Creating role '$DbUser' and database '$DbName'..."
& $Psql -U postgres -h 127.0.0.1 -d postgres -v ON_ERROR_STOP=1 -c @"
DO `$`$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DbUser') THEN
    CREATE ROLE $DbUser LOGIN PASSWORD '$DbPassword';
  END IF;
END `$`$;
"@
if ($LASTEXITCODE -ne 0) { throw "psql failed (check postgres password)" }

$dbExists = & $Psql -U postgres -h 127.0.0.1 -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname = '$DbName'"
if (-not ($dbExists -match "1")) {
  & $Psql -U postgres -h 127.0.0.1 -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $DbName OWNER $DbUser;"
  if ($LASTEXITCODE -ne 0) { throw "CREATE DATABASE failed" }
}

$databaseUrl = "postgresql://${DbUser}:${DbPassword}@127.0.0.1:5432/${DbName}"
$env:DATABASE_URL = $databaseUrl

Write-Host "Applying Drizzle schema..."
Set-Location $Root
pnpm --filter @workspace/db run push
if ($LASTEXITCODE -ne 0) { throw "drizzle push failed" }

$apiEnv = Join-Path $Root "artifacts\api-server\.env.local"
@(
  "PORT=8080",
  "NODE_ENV=development",
  "SKIP_CLERK_AUTH=true",
  "DATABASE_URL=$databaseUrl",
  "SESSION_SECRET=dev-local-session-secret-32chars-min",
  "ADMIN_USERNAME=admin",
  "ADMIN_PASSWORD=admin"
) | Set-Content -Path $apiEnv -Encoding utf8

$webEnv = Join-Path $Root "artifacts\elimu-pawa\.env.local"
@(
  "VITE_SKIP_CLERK=true"
) | Set-Content -Path $webEnv -Encoding utf8

Write-Host ""
Write-Host "Done. DATABASE_URL written to artifacts/api-server/.env.local"
Write-Host "Restart dev servers: .\scripts\dev.ps1"
