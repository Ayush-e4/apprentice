# Adds Apprentice's MCP server to Claude Desktop on Windows.
#
#   1. Quit Claude Desktop completely (system tray icon > Quit). Claude rewrites its
#      config while running, so an entry added while it's open can be dropped.
#   2. powershell -ExecutionPolicy Bypass -File scripts\claude-desktop-mcp.ps1
#   3. Start Claude Desktop. "apprentice" appears in a chat's tools menu.
#
# The MCP server talks to a running gateway (APPRENTICE_URL, default http://localhost:8000).
# Only the "apprentice" entry is added or replaced; everything else in the config is kept,
# and a backup is saved next to it first.

param([string]$Url = "http://localhost:8000")

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$python = Join-Path $root ".venv\Scripts\python.exe"
if (-not (Test-Path $python)) { throw "No virtualenv at .venv. Run: python -m venv .venv; .venv\Scripts\pip install -r requirements.txt" }

if (Get-Process -Name "Claude" -ErrorAction SilentlyContinue) {
    Write-Warning "Claude Desktop is running. Quit it from the system tray first, or it may overwrite this change."
}

$path = Join-Path $env:APPDATA "Claude\claude_desktop_config.json"
New-Item -ItemType Directory -Force (Split-Path $path) | Out-Null
$json = if (Test-Path $path) { Get-Content $path -Raw } else { "{}" }
if (Test-Path $path) { Copy-Item $path "$path.backup" -Force }

# Edit with Python's json module so the rest of the file is preserved exactly.
$edit = @'
import json, sys
path, python, root, url = sys.argv[1:5]
raw = open(path, encoding="utf-8-sig").read() if __import__("os").path.exists(path) else "{}"
config = json.loads(raw or "{}")
config.setdefault("mcpServers", {})["apprentice"] = {
    "command": python,
    "args": ["-m", "apprentice.mcp_server"],
    "env": {"APPRENTICE_URL": url, "PYTHONPATH": root},
}
open(path, "w", encoding="utf-8").write(json.dumps(config, indent=2))
print("mcpServers:", ", ".join(config["mcpServers"]))
'@
# Windows PowerShell 5.1 can strip quotes from inline arguments to native programs, so run it from a file.
$script = Join-Path ([System.IO.Path]::GetTempPath()) "apprentice-claude-mcp.py"
Set-Content -Path $script -Value $edit -Encoding utf8
& $python $script $path $python $root $Url
$failed = $LASTEXITCODE -ne 0
Remove-Item $script -ErrorAction SilentlyContinue
if ($failed) { throw "Could not update $path (unchanged; backup at $path.backup)." }
Write-Host "Added 'apprentice' to $path (backup: $path.backup). Start Claude Desktop to load it."
