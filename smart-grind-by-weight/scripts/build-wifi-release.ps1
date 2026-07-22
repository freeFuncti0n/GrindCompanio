# Build WiFi firmware release binaries into ./release/
# Edit src/config/wifi_credentials.h first if you want credentials baked in.

$ErrorActionPreference = 'Stop'
$root = Resolve-Path (Join-Path $PSScriptRoot '..')
Set-Location $root

$env:PLATFORMIO_CORE_DIR = if ($env:PLATFORMIO_CORE_DIR) { $env:PLATFORMIO_CORE_DIR } else { Join-Path $env:USERPROFILE '.platformio' }
$py = Join-Path $root 'tools\venv\Scripts\python.exe'
if (-not (Test-Path $py)) { throw "PlatformIO venv missing: $py" }

$envName = 'waveshare-esp32s3-touch-amoled-164'
Write-Host "Building $envName ..." -ForegroundColor Cyan
& $py -m platformio run -e $envName
if ($LASTEXITCODE -ne 0) { throw "Build failed" }

$buildDir = Join-Path $root ".pio\build\$envName"
$releaseDir = Join-Path $root 'release'
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null

Copy-Item -Force (Join-Path $buildDir 'firmware.bin') (Join-Path $releaseDir 'firmware-v1.4.0-wifi.bin')
Copy-Item -Force (Join-Path $buildDir 'bootloader.bin') (Join-Path $releaseDir 'bootloader.bin')
Copy-Item -Force (Join-Path $buildDir 'partitions.bin') (Join-Path $releaseDir 'partitions.bin')

@"
# Release binaries — firmware/v1.4.0-wifi

Built from Jaapp **v1.4.0** + GrindCompanio WiFi LAN API.

| File | Flash offset |
|------|----------------|
| bootloader.bin | 0x0 |
| partitions.bin | 0x8000 |
| firmware-v1.4.0-wifi.bin | 0x320000 |

**WiFi credentials:** edit ``src/config/wifi_credentials.h``, then re-run ``scripts/build-wifi-release.ps1``.

Full guide: [docs/WIFI_SETUP.md](../docs/WIFI_SETUP.md)
"@ | Set-Content -Encoding utf8 (Join-Path $releaseDir 'README.md')

$fw = Get-Item (Join-Path $releaseDir 'firmware-v1.4.0-wifi.bin')
Write-Host "OK: $($fw.FullName) ($([math]::Round($fw.Length/1MB, 2)) MB)" -ForegroundColor Green
