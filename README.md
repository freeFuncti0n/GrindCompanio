# GrindCompanio

An extension of [smart-grind-by-weight](https://github.com/jaapp/smart-grind-by-weight) by [jaapp](https://github.com/jaapp) and contributors.

**Author:** [freeFuncti0n](https://github.com/freeFuncti0n)

Monorepo: **browser companion** + ESP32 firmware with WiFi LAN API for Eureka Grind-by-Weight.

> The companion is a **web app** in the browser (WiFi). Live data and remote control use **REST + WebSocket**, not BLE.

---

## Acknowledgements

This project would not exist without **[smart-grind-by-weight](https://github.com/jaapp/smart-grind-by-weight)**.

**Thank you to [jaapp](https://github.com/jaapp)** for creating and maintaining the original firmware, hardware designs, and tooling — and to **all contributors** to that project for the open-source grind-by-weight ecosystem this fork builds on.

GrindCompanio adds a WiFi LAN API and browser companion on top of that foundation. The upstream project remains the core; this repo is a grateful extension, not a replacement.

---

## What you need

1. The complete build of **[smart-grind-by-weight](https://github.com/jaapp/smart-grind-by-weight)**
2. This firmware (Jaapp **v1.4.0** + GrindCompanio WiFi API) — source or release binaries under [`smart-grind-by-weight/release/`](smart-grind-by-weight/release/)
3. **2.4 GHz** Wi‑Fi (ESP32-S3 has no 5 GHz)
4. Something wich runs the Web App like a Py or NAS (`grind-companion-webapp`)

---

## Flash firmware (step by step)

### 1. Set WiFi credentials

**Edit this file only:**

[`smart-grind-by-weight/src/config/wifi_credentials.h`](smart-grind-by-weight/src/config/wifi_credentials.h)

```cpp
#define WIFI_SSID "Your2.4GHzSSID"
#define WIFI_PASSWORD "YourPassword"
```

Keep the quotes. The bundled release `.bin` has **empty** credentials (no secrets in the repo) — without your own build, the board will not join Wi‑Fi.

### 2. Build and flash

**Option A — PlatformIO (recommended)**

```powershell
cd smart-grind-by-weight
$env:PLATFORMIO_CORE_DIR = "$env:USERPROFILE\.platformio"
.\tools\venv\Scripts\python.exe -m platformio run -e waveshare-esp32s3-touch-amoled-164 -t upload --upload-port COM8
```

Replace `COM8` with your USB port (Device Manager / `pio device list`).

**Option B — Release binary with esptool** (only useful after rebuilding with your SSID)

```powershell
cd smart-grind-by-weight\release
esptool --chip esp32s3 --port COM8 --baud 460800 write-flash `
  0x0 bootloader.bin `
  0x8000 partitions.bin `
  0x320000 firmware-v1.4.0-wifi.bin
```

| File | Flash offset |
|------|----------------|
| `bootloader.bin` | `0x0` |
| `partitions.bin` | `0x8000` |
| `firmware-v1.4.0-wifi.bin` | `0x320000` |

Files: [`smart-grind-by-weight/release/`](smart-grind-by-weight/release/)  
Build script: [`smart-grind-by-weight/scripts/build-wifi-release.ps1`](smart-grind-by-weight/scripts/build-wifi-release.ps1)

### 3. Verify

1. Serial monitor at **115200** baud
2. Expected lines: `WiFi: Connected — IP …`, `HTTP: Server started on port 8080`
3. Browser: `http://<ESP-IP>:8080/api/status`

Full guide: [`smart-grind-by-weight/docs/WIFI_SETUP.md`](smart-grind-by-weight/docs/WIFI_SETUP.md) · API: [`WIFI_API.md`](smart-grind-by-weight/docs/WIFI_API.md)

**Vanilla Jaapp v1.4.0 has no WiFi API** — the web companion requires this GrindCompanio firmware.

---

## Run the web app

```
Browser  --loads UI-->  NAS :8088 (nginx)
Browser  --REST/WS-->  ESP :8080  (same 2.4 GHz LAN)
```

```powershell
cd grind-companion-webapp
npm install
npm run build
docker compose up -d --build
# → http://<nas-ip>:8088
```

Local development: `npm run dev` → `http://localhost:5173` → **Connect** → enter ESP IP.

Details: [`grind-companion-webapp/README.md`](grind-companion-webapp/README.md)

### Web app features

| Area | Description |
|------|-------------|
| Connect | ESP IP, status, session sync |
| Grind | Live weight/chart via **WebSocket**, remote Start/Stop/Purge |
| Analytics | Sessions, journal (bean, dial, shot time, yield, ratio, score), beans, diagnose |

Journal and diagnose use **synced WiFi sessions** (dose = `final_weight`), not BLE.

UI languages: **German** and **English** (gear icon in the header).

---

## Repository layout

| Folder | Description |
|--------|-------------|
| [`grind-companion-webapp/`](grind-companion-webapp/) | Browser companion (WiFi) |
| [`smart-grind-by-weight/`](smart-grind-by-weight/) | Firmware v1.4.0 + WiFi API + release binaries |

Development and releases are on **`main`**.

---

## Upstream & legal

Firmware is based on **[jaapp/smart-grind-by-weight](https://github.com/jaapp/smart-grind-by-weight)** (GPL-3.0). Companion code is MIT (freeFuncti0n).

[LICENSE](LICENSE) · [NOTICE](NOTICE) · [DISCLAIMER.md](DISCLAIMER.md) · [PRIVACY.md](PRIVACY.md)
