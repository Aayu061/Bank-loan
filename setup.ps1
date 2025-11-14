# setup.ps1 - Windows helper to install dependencies and run migrations + seed
# Usage: Open PowerShell in this folder and run: .\setup.ps1
# If you've already installed packages (for example via WSL), run: .\setup.ps1 -SkipInstall
param(
  [switch]$SkipInstall
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $root

try {
  if (-not $SkipInstall) {
    Write-Host "Installing npm packages (using npm.cmd)..."
    & .\npm.cmd install
    if ($LASTEXITCODE -ne 0) { Write-Error "npm install failed (exit $LASTEXITCODE)"; exit $LASTEXITCODE }
  }

  Write-Host "Running migrations..."
  & node migrate.js
  if ($LASTEXITCODE -ne 0) { Write-Error "migrations failed (exit $LASTEXITCODE)"; exit $LASTEXITCODE }

  Write-Host "Seeding admin user (if not present)..."
  & node .\scripts\seed_admin.js
  if ($LASTEXITCODE -ne 0) { Write-Error "seeding failed (exit $LASTEXITCODE)"; exit $LASTEXITCODE }

  Write-Host "Setup complete. Start the server with: npm start"
} finally {
  Pop-Location
}
