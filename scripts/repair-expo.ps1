$ErrorActionPreference = "Stop"
$env:CI = "1"
$env:NODE_OPTIONS = "--max-old-space-size=4096"

function Invoke-Checked([string]$Command) {
  Write-Host ">> $Command"
  cmd /c $Command
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed with exit code ${LASTEXITCODE}: $Command"
  }
}

Write-Host "Stopping stale Node/Metro processes..."
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host "Cleaning Expo and Metro caches..."
if (Test-Path ".expo") { Remove-Item ".expo" -Recurse -Force }
if (Test-Path ".expo-shared") { Remove-Item ".expo-shared" -Recurse -Force }
if (Test-Path "node_modules\\.cache") { Remove-Item "node_modules\\.cache" -Recurse -Force }

Write-Host "Reinstalling dependencies..."
if (Test-Path "node_modules") { Remove-Item "node_modules" -Recurse -Force }
if (Test-Path "package-lock.json") { Remove-Item "package-lock.json" -Force }

Write-Host "Installing dependencies (attempt 1)..."
cmd /c "npm install --no-audit --no-fund"
if ($LASTEXITCODE -ne 0) {
  Write-Host "Initial install failed. Retrying with legacy peer resolution..."
  Invoke-Checked "npm install --legacy-peer-deps --no-audit --no-fund"
}

Write-Host "Aligning Expo SDK dependencies..."
Invoke-Checked "npx --yes expo@54.0.33 install --fix"
Invoke-Checked "npx --yes expo@54.0.33 install expo-constants expo-linking react-native-worklets babel-preset-expo"

Write-Host "Running health checks..."
Invoke-Checked "npx --yes expo-doctor"
Invoke-Checked "npm run typecheck"

Write-Host ""
Write-Host "Repair complete."
Write-Host "Start with: npm run start:clear"
