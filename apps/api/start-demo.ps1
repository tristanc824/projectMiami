# Starts the Nest server and its public ngrok address, each in its own window. Keep both windows open.
# Run from apps/api:  powershell -ExecutionPolicy Bypass -File .\start-demo.ps1
# Put your ngrok static domain in NGROK_DOMAIN (for example in your PowerShell profile), or pass -Domain.
param([string]$Domain = $env:NGROK_DOMAIN)

$here = $PSScriptRoot
if (-not $Domain) { Write-Host 'Pass your ngrok domain: .\start-demo.ps1 -Domain your-name.ngrok-free.dev' -ForegroundColor Yellow; exit 1 }

$ngrok = (Get-Command ngrok -ErrorAction SilentlyContinue).Source
if (-not $ngrok) {
  $ngrok = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter ngrok.exe -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
}
if (-not $ngrok) { Write-Host 'ngrok not found. Install it with: winget install ngrok.ngrok' -ForegroundColor Red; exit 1 }

if (-not (Test-Path "$here\.next\BUILD_ID")) {
  Write-Host 'Building the server first (about a minute)...'
  Push-Location $here; npm run build; Pop-Location
}

Start-Process powershell -WorkingDirectory $here -ArgumentList '-NoExit', '-Command', "`$host.UI.RawUI.WindowTitle = 'Nest server'; npx next start -p 5184"
Start-Process powershell -WorkingDirectory $here -ArgumentList '-NoExit', '-Command', "`$host.UI.RawUI.WindowTitle = 'Nest ngrok'; & '$ngrok' http --url=https://$Domain 5184"
Write-Host "Started. Server: http://localhost:5184  Public: https://$Domain" -ForegroundColor Green
Write-Host 'Also keep the httpSMS app open on the Android.'
