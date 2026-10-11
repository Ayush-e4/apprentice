# Starts everything the demo needs and checks it, on Windows PowerShell.
#
#   powershell -ExecutionPolicy Bypass -File scripts\demo.ps1
#
# Main gateway (Kirana Copilot + dashboard) on :8000, QuickBite support on :8001
# with its own memory. Already-running gateways are left alone.

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root
$py = Join-Path $root ".venv\Scripts\python.exe"
if (-not (Test-Path $py)) { throw "No virtualenv at .venv. Run: python -m venv .venv; .venv\Scripts\pip install -r requirements.txt" }
New-Item -ItemType Directory -Force (Join-Path $root "data\runtime") | Out-Null

function Test-Port($port) {
    try { Invoke-WebRequest "http://127.0.0.1:$port/api/stats" -UseBasicParsing -TimeoutSec 3 | Out-Null; return $true } catch { return $false }
}

function Start-Gateway($port, $extraEnv) {
    if (Test-Port $port) { Write-Host "gateway :$port already running"; return }
    foreach ($k in $extraEnv.Keys) { Set-Item "env:$k" $extraEnv[$k] }
    Start-Process $py -ArgumentList "-m", "uvicorn", "apprentice.gateway:app", "--port", "$port", "--log-level", "warning" `
        -WindowStyle Hidden -RedirectStandardError (Join-Path $root "data\runtime\gateway-$port.log") | Out-Null
    foreach ($k in $extraEnv.Keys) { Set-Item "env:$k" "" }
    foreach ($i in 1..20) { if (Test-Port $port) { Write-Host "gateway :$port started"; return }; Start-Sleep 1 }
    throw "gateway :$port did not start; see data\runtime\gateway-$port.log"
}

if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) { Write-Warning "ollama not on PATH: the local student needs it" }

Start-Gateway 8000 @{}
Start-Gateway 8001 @{ APPRENTICE_DB = "data/runtime/support.db"; SUPPORT_MIN_SIM = "0.72" }

$h = Invoke-RestMethod "http://127.0.0.1:8000/api/health" -TimeoutSec 30
Write-Host ""
foreach ($p in $h.checks.PSObject.Properties) {
    $c = $p.Value
    $mark = if ($c.ok) { "[ok]  " } else { "[DOWN]" }
    Write-Host ("{0} {1,-18} {2}" -f $mark, $p.Name, $c.detail)
}
Write-Host ""
if ($h.ok) { Write-Host "Ready." } else { Write-Warning "Something required is down; see above." }
Write-Host "Kirana Copilot:  http://localhost:8000/shop"
Write-Host "Dashboard:       http://localhost:8000"
Write-Host "QuickBite:       http://localhost:8001/support"
