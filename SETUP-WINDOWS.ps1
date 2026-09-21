$ErrorActionPreference = "Stop"
Write-Host "AutoFace Mobile v0.1.1 - clean Expo SDK 57 setup" -ForegroundColor Cyan

$nodeMajor = [int]((node -v).TrimStart('v').Split('.')[0])
if ($nodeMajor -lt 22) {
  Write-Host "Node 22.13+ is recommended for Expo SDK 57. Current: $(node -v)" -ForegroundColor Yellow
}

if (Test-Path node_modules) { Remove-Item node_modules -Recurse -Force }
if (Test-Path package-lock.json) { Remove-Item package-lock.json -Force }
if (Test-Path .expo) { Remove-Item .expo -Recurse -Force }

if (-not (Test-Path .env)) {
  Copy-Item .env.example .env
  Write-Host "Created .env. Add your EXPO_PUBLIC_FIREBASE_* values before testing sign-in." -ForegroundColor Yellow
}

npm install
if ($LASTEXITCODE -ne 0) { throw "npm install failed" }

npx expo-doctor
Write-Host "Setup complete. Start with: npx expo start --clear" -ForegroundColor Green
