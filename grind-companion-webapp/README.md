# Grind Companion Web

Browser UI for [smart-grind-by-weight](../smart-grind-by-weight) over **WiFi LAN** (REST + WebSocket).  
Runs on a **NAS** (Docker/nginx) or locally. The browser talks **directly** to the ESP — the host only serves static files.

**Author:** [freeFuncti0n](https://github.com/freeFuncti0n) · **License:** MIT

**Full setup (firmware flash + Docker):** [../docs/DOC.md](../docs/DOC.md)

Live data and remote control use **WiFi** (REST + WebSocket), not BLE.

## Architecture

```
Browser  --loads UI-->  host :8088 (nginx / Docker)
Browser  --REST/WS-->  ESP :8080  (same 2.4 GHz LAN)
```

## Docker (NAS)

```bash
cd grind-companion-webapp
cp .env.example .env   # optional: WEB_PORT=8088
docker compose up -d --build
```

URL: `http://<host-ip>:8088` (use HTTP so the browser can reach the ESP on HTTP).

### Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `WEB_PORT` | `8088` | Host port mapped to nginx (container port 80) |

### ARM NAS

Build on the NAS, or:

```bash
docker buildx build --platform linux/arm64 -t grind-companion-web:latest --load .
docker compose up -d
```

## Local development

```bash
npm install
npm run dev
```

`http://localhost:5173` → **Connect** → ESP IP.

## Firmware requirement

Vanilla Jaapp **v1.4.0 has no WiFi API**. See [../docs/DOC.md](../docs/DOC.md).

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Connect fails | Same LAN/band; WiFi firmware; correct IP; port 8080 |
| Live empty | Grind must be active for WS frames |
| Sync empty | Logging on ESP; HTTP 503 if OTA/export busy |
| HTTPS UI + HTTP ESP | Use HTTP for UI (v1) |

API: [`WIFI_API.md`](../smart-grind-by-weight/docs/WIFI_API.md)
