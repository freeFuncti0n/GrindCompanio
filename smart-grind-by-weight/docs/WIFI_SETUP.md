# WiFi setup (v1.4.0 + LAN API)

This guide applies to GrindCompanio firmware on **`main`**: Jaapp base **v1.4.0** plus WiFi (REST + WebSocket on port **8080**).

## Which file to edit?

**Only this file:**

[`src/config/wifi_credentials.h`](../src/config/wifi_credentials.h)

```cpp
#define WIFI_SSID "Your2.4GHzNetwork"
#define WIFI_PASSWORD "YourPassword"
```

- **2.4 GHz only** (ESP32-S3 has no 5 GHz)
- Keep the quotes
- Then **rebuild and flash** (the prebuilt `.bin` without your SSID will not join Wi‑Fi)

## Flash prebuilt firmware (without rebuilding)

Prebuilt files are under [`release/`](../release/):

| File | Meaning |
|------|---------|
| `firmware-v1.4.0-wifi.bin` | App image (offset **0x320000** with Delta OTA partition) |
| `bootloader.bin` | Bootloader |
| `partitions.bin` | Partition table |

### Option A — PlatformIO (recommended after changing SSID)

```powershell
cd smart-grind-by-weight

# 1) Edit wifi_credentials.h
# 2) Build + flash:
$env:PLATFORMIO_CORE_DIR = "$env:USERPROFILE\.platformio"
.\tools\venv\Scripts\python.exe -m platformio run -e waveshare-esp32s3-touch-amoled-164 -t upload --upload-port COM8
```

Adjust the COM port (`COM8` → your port).

### Option B — esptool (release binary)

```powershell
cd smart-grind-by-weight\release
esptool --chip esp32s3 --port COM8 --baud 460800 write-flash `
  0x0 bootloader.bin `
  0x8000 partitions.bin `
  0x320000 firmware-v1.4.0-wifi.bin
```

**Note:** The shipped release `.bin` has **empty** `WIFI_SSID` / `WIFI_PASSWORD` (no secrets in the repo). For Wi‑Fi use: set `wifi_credentials.h` → rebuild → flash.

Helper script: [`scripts/build-wifi-release.ps1`](../scripts/build-wifi-release.ps1)

## After flashing

1. Open the serial monitor at **115200** baud
2. Expected lines:
   - `WiFi: Connecting to "…"`
   - `WiFi: Connected — IP 192.168.x.x`
   - `HTTP: Server started on port 8080`
3. Optionally reserve a DHCP lease in your router
4. Test: browser → `http://<ESP-IP>:8080/api/status`
5. Web UI: [`grind-companion-webapp`](../../grind-companion-webapp/README.md) on the NAS → Connect → enter IP

## API overview

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/status` | IP, build, features |
| POST | `/api/live/start` … `/idle` | Remote grind |
| GET | `/api/sessions` | Session list |
| WS | `ws://<ip>:8080/ws/live` | Live telemetry (20 bytes) |

Full reference: [`WIFI_API.md`](WIFI_API.md)

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `No SSID configured` | Fill in `wifi_credentials.h` and flash **again** |
| Does not connect | Check 2.4 GHz, SSID/password, distance to AP |
| No HTTP response | Wi‑Fi must be connected; allow port 8080 on the LAN |
| Vanilla Jaapp | Without this GrindCompanio firmware there is **no** Wi‑Fi API |
