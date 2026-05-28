# Local dev on Windows — run from repo root: .\scripts\dev.ps1
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  corepack enable | Out-Null
  corepack prepare pnpm@latest --activate | Out-Null
}

if (-not (Test-Path "$Root\node_modules")) {
  pnpm install --ignore-scripts
}

$env:NODE_ENV = "development"
$env:PORT = "8080"
$env:SKIP_CLERK_AUTH = "true"
$env:SESSION_SECRET = "dev-local-session-secret-32chars-min"
$env:ADMIN_USERNAME = "admin"
$env:ADMIN_PASSWORD = "admin"
$apiEnvFile = Join-Path $Root "artifacts\api-server\.env.local"
if (Test-Path $apiEnvFile) {
  Get-Content $apiEnvFile | ForEach-Object {
    if ($_ -match '^\s*([^#=]+)=(.*)$') {
      $key = $matches[1].Trim()
      if (-not (Get-Item "Env:$key" -ErrorAction SilentlyContinue)) {
        Set-Item -Path "Env:$key" -Value $matches[2].Trim()
      }
    }
  }
}
if (-not $env:DATABASE_URL) {
  Write-Warning "DATABASE_URL not set. Run .\scripts\setup-postgres.ps1 or add artifacts/api-server/.env.local"
}

Write-Host "Building API server..."
pnpm --filter @workspace/api-server run build

Write-Host "Starting API on http://localhost:8080 ..."
Start-Process powershell -ArgumentList @(
  "-NoExit", "-Command",
  "cd '$Root'; `$env:NODE_ENV='development'; `$env:PORT='8080'; `$env:SKIP_CLERK_AUTH='true'; `$env:SESSION_SECRET='dev-local-session-secret-32chars-min'; `$env:ADMIN_USERNAME='admin'; `$env:ADMIN_PASSWORD='admin'; `$env:DATABASE_URL='$($env:DATABASE_URL)'; pnpm --filter @workspace/api-server run start"
)

Start-Sleep -Seconds 2

Write-Host "Starting frontend on http://localhost:5173 ..."
$env:PORT = "5173"
$env:VITE_SKIP_CLERK = "true"
pnpm --filter @workspace/elimu-pawa run dev
