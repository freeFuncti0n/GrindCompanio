# Grind Companion Web

Browser-UI for [smart-grind-by-weight](../smart-grind-by-weight) over **WiFi LAN** (REST + WebSocket).  
Hosted on a **Ugreen NAS** (Docker/Nginx). The browser talks **directly** to the ESP — the NAS only serves static files.

**Author:** [freeFuncti0n](https://github.com/freeFuncti0n) · **License:** MIT

## Architecture

```
Browser  --loads UI-->  NAS :8088 (nginx)
Browser  --REST/WS--->  ESP :8080  (same 2.4 GHz LAN)
```

No BLE. No Apple/Android app required.

## Local development

```bash
cd grind-companion-webapp
npm install
npm run dev
```

Open `http://localhost:5173` → **Connect** → enter ESP IP (after WiFi firmware is flashed).

## Docker (Ugreen NAS)

```bash
cd grind-companion-webapp
docker compose build
docker compose up -d
```

App URL: `http://<nas-ip>:8088`

Both UI and ESP API use **HTTP** on the LAN (avoids mixed-content blocks).

### Multi-arch tip

On an ARM NAS, build on the NAS itself, or:

```bash
docker buildx build --platform linux/arm64 -t grind-companion-web:latest --load .
```

## Features

| Tab | Function |
|-----|----------|
| Connect | ESP IP (`localStorage`), status, session sync |
| Grind | Live chart (WebSocket), remote Start/Stop/Purge/Idle |
| Analytics | Sessions from IndexedDB, journal, beans, diagnose |

## ESP firmware requirement

Vanilla Jaapp **v1.4.0 has no WiFi API**. Flash the fork with WiFi modules (see [../smart-grind-by-weight/docs/WIFI_API.md](../smart-grind-by-weight/docs/WIFI_API.md)).

Configure SSID/password (2.4 GHz), then note the IP from serial log after boot.

Example compile flags in `platformio.ini`:

```ini
-DWIFI_COMPILE_SSID=\"YourSSID\"
-DWIFI_COMPILE_PASSWORD=\"YourPassword\"
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Connect fails | Same LAN/WiFi band; ESP WiFi firmware; IP correct; port 8080 |
| Live empty | Grind must be active for WS frames; check `ws://<ip>:8080/ws/live` |
| Sync empty | Logging on ESP (`Menu → Logs & Data`); HTTP 503 if OTA/export busy |
| HTTPS UI + HTTP ESP | Use HTTP for NAS UI in v1, or add reverse proxy later |

API reference: [WIFI_API.md](../smart-grind-by-weight/docs/WIFI_API.md)
