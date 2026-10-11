$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectRoot
$env:DEBUG = 'True'
$env:DB_ENGINE = 'sqlite'
$env:SQLITE_NAME = 'logs/demo.sqlite3'
New-Item -ItemType Directory -Path (Join-Path $projectRoot 'logs') -Force | Out-Null
& .\venv\Scripts\python.exe manage.py migrate --noinput
if ($LASTEXITCODE -ne 0) { throw 'No fue posible migrar la base de demostracion.' }
& .\venv\Scripts\python.exe manage.py seed_demo
if ($LASTEXITCODE -ne 0) { throw 'No fue posible preparar la demostracion.' }
Write-Host 'Backend: http://127.0.0.1:8000 - Frontend en otra terminal: cd frontend; npm.cmd run dev'
& .\venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000 --noreload
