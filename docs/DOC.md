# GrindCompanio — Full setup guide

From **WiFi firmware flash** to **browser companion on Docker**.

This guide covers the **GrindCompanio fork** (WiFi LAN API + web app). It does **not** replace the upstream hardware build documentation.

---

## Table of contents

1. [Architecture](#architecture)
2. [Prerequisites](#prerequisites)
3. [Upstream: build the grinder mod](#upstream-build-the-grinder-mod)
4. [Flash GrindCompanio WiFi firmware](#flash-grindcompanio-wifi-firmware)
5. [Verify the ESP on your network](#verify-the-esp-on-your-network)
6. [Host the web app with Docker](#host-the-web-app-with-docker)
7. [First use in the browser](#first-use-in-the-browser)
8. [Troubleshooting](#troubleshooting)
9. [Further reading](#further-reading)

---

## Architecture

```
┌─────────────┐     loads UI (HTTP)      ┌──────────────────┐
│   Browser   │ ───────────────────────► │  NAS / PC :8088  │
│  (phone/PC) │                          │  nginx (Docker)  │
└──────┬──────┘                          └──────────────────┘
       │
       │  REST + WebSocket (HTTP :8080, WS /ws/live)
       │  same 2.4 GHz LAN — direct, not via NAS
       ▼
┌─────────────┐
│  ESP32-S3   │  GrindCompanio firmware (Jaapp v1.4.0 + WiFi API)
│  on grinder │
└─────────────┘
```

- The **NAS (or any Docker host)** only serves static files (HTML/JS/CSS).
- The **browser talks directly to the ESP** for API and live data.
- **No cloud backend** from this project; session/journal data stays in the browser (IndexedDB).

---

## Prerequisites

| Item | Notes |
|------|--------|
| Working **smart-grind-by-weight** install | See [upstream DOC](https://github.com/jaapp/smart-grind-by-weight/blob/main/docs/DOC.md) — hardware, wiring, calibration |
| **2.4 GHz** Wi‑Fi | ESP32-S3 does not support 5 GHz |
| USB cable | For flashing (PlatformIO or esptool) |
| Docker host | NAS (e.g. Ugreen), Raspberry Pi, or PC on the **same LAN** as the ESP |
| Modern browser | Chrome, Edge, Firefox — on the same LAN as ESP and Docker host |

**You need GrindCompanio firmware** — vanilla Jaapp v1.4.0 has **no** WiFi HTTP/WebSocket API.

---

## Upstream: build the grinder mod

GrindCompanio assumes you already have (or are building) the base mod:

- 3D-printed parts, load cell, ESP32-S3 display board, wiring, calibration
- Initial firmware flash via [Jaapp web flasher](https://jaapp.github.io/smart-grind-by-weight) or PlatformIO

**Full upstream documentation:**

- **[smart-grind-by-weight/docs/DOC.md](https://github.com/jaapp/smart-grind-by-weight/blob/main/docs/DOC.md)** — main user & build guide  
- [TROUBLESHOOTING.md](https://github.com/jaapp/smart-grind-by-weight/blob/main/docs/TROUBLESHOOTING.md)  
- [3D prints](https://github.com/jaapp/smart-grind-by-weight/blob/main/docs/3D_PRINTS.md)  
- [Grinder compatibility](https://github.com/jaapp/smart-grind-by-weight/blob/main/docs/GRINDER_COMPATIBILITY.md)

Return here once the grinder runs upstream firmware and you are ready to add **WiFi + the web companion**.

---

## Flash GrindCompanio WiFi firmware

### 1. Get the source

```bash
git clone https://github.com/freeFuncti0n/GrindCompanio.git
cd GrindCompanio
```

Or download and extract the repository ZIP.

### 2. Set WiFi credentials

Edit **only** this file:

[`smart-grind-by-weight/src/config/wifi_credentials.h`](../smart-grind-by-weight/src/config/wifi_credentials.h)

```cpp
#define WIFI_SSID "Your2.4GHzSSID"
#define WIFI_PASSWORD "YourPassword"
```

Keep the quotes. The prebuilt release `.bin` in the repo has **empty** credentials — you must rebuild after setting SSID/password.

### 3. Build and flash

**Option A — PlatformIO (recommended)**

```powershell
cd smart-grind-by-weight
$env:PLATFORMIO_CORE_DIR = "$env:USERPROFILE\.platformio"
.\tools\venv\Scripts\python.exe -m platformio run -e waveshare-esp32s3-touch-amoled-164 -t upload --upload-port COM8
```

Linux/macOS:

```bash
cd smart-grind-by-weight
pio run -e waveshare-esp32s3-touch-amoled-164 -t upload
```

Replace `COM8` with your serial port.

**Option B — esptool** (after building a `.bin` with your SSID)

```bash
cd smart-grind-by-weight/release
esptool --chip esp32s3 --port COM8 --baud 460800 write-flash \
  0x0 bootloader.bin \
  0x8000 partitions.bin \
  0x320000 firmware-v1.4.0-wifi.bin
```

| File | Flash offset |
|------|----------------|
| `bootloader.bin` | `0x0` |
| `partitions.bin` | `0x8000` |
| `firmware-v1.4.0-wifi.bin` | `0x320000` |

Release build script (Windows): [`smart-grind-by-weight/scripts/build-wifi-release.ps1`](../smart-grind-by-weight/scripts/build-wifi-release.ps1)

More detail: [`smart-grind-by-weight/docs/WIFI_SETUP.md`](../smart-grind-by-weight/docs/WIFI_SETUP.md)

---

## Verify the ESP on your network

1. Open serial monitor at **115200** baud.
2. After boot you should see:
   - `WiFi: Connecting to "…"`
   - `WiFi: Connected — IP 192.168.x.x`
   - `HTTP: Server started on port 8080`
3. Note the **IP address** (set a DHCP reservation in your router if you like).
4. Test in a browser on the same LAN:

   `http://<ESP-IP>:8080/api/status`

   You should get JSON with build info and feature flags.

5. On the grinder: enable session logging if you want analytics sync — **Menu → Logs & Data** (upstream UI).

API reference: [`smart-grind-by-weight/docs/WIFI_API.md`](../smart-grind-by-weight/docs/WIFI_API.md)

---

## Host the web app with Docker

### 1. Prepare environment file

```bash
cd grind-companion-webapp
cp .env.example .env
```

Edit `.env` if needed:

```env
WEB_PORT=8088
```

This maps host port `8088` → container port `80` (nginx).

### 2. Build and start

```bash
docker compose up -d --build
```

Check status:

```bash
docker compose ps
docker compose logs -f
```

### 3. Open the UI

`http://<docker-host-ip>:8088`

Use **HTTP**, not HTTPS, for the UI in v1. The browser must be allowed to call `http://<ESP-IP>:8080` (mixed content if the UI is HTTPS).

### ARM NAS (build on device)

If `docker compose build` fails on an ARM NAS, build on the NAS itself (simplest), or from another machine:

```bash
docker buildx build --platform linux/arm64 -t grind-companion-web:latest --load .
docker compose up -d
```

### Update after `git pull`

```bash
cd grind-companion-webapp
git pull   # from repo root if you cloned the monorepo
docker compose up -d --build
```

### Stop / remove

```bash
docker compose down
```

Container data is stateless; browser IndexedDB stays on each client device.

---

## First use in the browser

1. Open `http://<docker-host>:8088`
2. **Connect** tab → enter **ESP IP** (e.g. `192.168.1.42`) → **Connect WiFi**
3. **Sync Sessions** — imports grind logs from the ESP into IndexedDB
4. **Grind** — live weight/chart (WebSocket) and remote Start/Stop/Purge while grinding
5. **Analytics** — open a session → fill **Journal** (bean, dial, shot time, yield, score)
6. **Diagnose** — recommendations after enough journal entries
7. **Gear icon** (header) → switch language **German / English**

The ESP IP is stored in `localStorage` in your browser.

---

## Troubleshooting

| Problem | What to check |
|---------|----------------|
| ESP won't join WiFi | 2.4 GHz only; SSID/password in `wifi_credentials.h`; reflash after edit |
| `No SSID configured` in serial log | Rebuild and flash after editing credentials |
| `/api/status` unreachable | Same LAN; firewall; ESP IP correct; port 8080 |
| Web UI loads but Connect fails | Browser and ESP on same network; WiFi firmware (not vanilla Jaapp) |
| Live chart empty | Start a grind; WebSocket only sends frames while active |
| Sync returns nothing | Enable logging on ESP; wait until OTA/export not busy (HTTP 503) |
| Docker build fails | Run on NAS CPU arch; try `buildx` for ARM |
| HTTPS UI, HTTP ESP blocked | Use HTTP for UI on port 8088, or add a reverse proxy later |

Firmware WiFi issues: [`WIFI_SETUP.md`](../smart-grind-by-weight/docs/WIFI_SETUP.md)  
Upstream grinder issues: [Jaapp TROUBLESHOOTING](https://github.com/jaapp/smart-grind-by-weight/blob/main/docs/TROUBLESHOOTING.md)

---

## Further reading

| Topic | Link |
|-------|------|
| WiFi API | [`smart-grind-by-weight/docs/WIFI_API.md`](../smart-grind-by-weight/docs/WIFI_API.md) |
| Web app (dev) | [`grind-companion-webapp/README.md`](../grind-companion-webapp/README.md) |
| Upstream full guide | [jaapp/smart-grind-by-weight docs/DOC.md](https://github.com/jaapp/smart-grind-by-weight/blob/main/docs/DOC.md) |
| Legal / privacy | [LICENSE](../LICENSE), [PRIVACY.md](../PRIVACY.md), [DISCLAIMER.md](../DISCLAIMER.md) |
