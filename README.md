# GrindCompanio

An extension of [smart-grind-by-weight](https://github.com/jaapp/smart-grind-by-weight) by [jaapp](https://github.com/jaapp) and contributors.

**Author:** [freeFuncti0n](https://github.com/freeFuncti0n)

Monorepo: **browser companion** + ESP32 firmware with WiFi LAN API for Eureka Grind-by-Weight.

> The companion is a **web app** in the browser (WiFi). Live data and remote control use **REST + WebSocket**, not BLE.

**Full setup guide (flash → Docker → first use):** **[docs/DOC.md](docs/DOC.md)**

---

## Acknowledgements

This project would not exist without **[smart-grind-by-weight](https://github.com/jaapp/smart-grind-by-weight)**.

**Thank you to [jaapp](https://github.com/jaapp)** for creating and maintaining the original firmware, hardware designs, and tooling — and to **all contributors** to that project for the open-source grind-by-weight ecosystem this fork builds on.

GrindCompanio adds a WiFi LAN API and browser companion on top of that foundation. The upstream project remains the core; this repo is a grateful extension, not a replacement.

---

## Quick start

| Step | Action |
|------|--------|
| 1 | Build the grinder mod — [upstream DOC](https://github.com/jaapp/smart-grind-by-weight/blob/main/docs/DOC.md) |
| 2 | Flash **GrindCompanio WiFi firmware** — [docs/DOC.md § Flash](docs/DOC.md#flash-grindcompanio-wifi-firmware) |
| 3 | Host **web app** on Docker — [docs/DOC.md § Docker](docs/DOC.md#host-the-web-app-with-docker) |

```
Browser  --loads UI-->  NAS :8088 (nginx / Docker)
Browser  --REST/WS-->  ESP :8080  (same 2.4 GHz LAN)
```

```bash
cd grind-companion-webapp
cp .env.example .env    # optional: change WEB_PORT
docker compose up -d --build
# → http://<nas-ip>:8088
```

Local development: `npm run dev` in `grind-companion-webapp` → `http://localhost:5173`

---

## Web app features

| Area | Description |
|------|-------------|
| Connect | ESP IP, status, session sync |
| Grind | Live weight/chart via **WebSocket**, remote Start/Stop/Purge |
| Analytics | Sessions, journal (bean, dial, shot time, yield, ratio, score), beans, diagnose |

UI languages: **German** and **English** (gear icon in the header).

---

## Repository layout

| Folder | Description |
|--------|-------------|
| [`grind-companion-webapp/`](grind-companion-webapp/) | Browser companion (WiFi) + Docker |
| [`smart-grind-by-weight/`](smart-grind-by-weight/) | Firmware v1.4.0 + WiFi API + release binaries |
| [`docs/DOC.md`](docs/DOC.md) | End-to-end setup guide |

Development and releases are on **`main`**.

---

## Upstream & legal

Firmware is based on **[jaapp/smart-grind-by-weight](https://github.com/jaapp/smart-grind-by-weight)** (GPL-3.0). Companion code is MIT (freeFuncti0n).

[LICENSE](LICENSE) · [NOTICE](NOTICE) · [DISCLAIMER.md](DISCLAIMER.md) · [PRIVACY.md](PRIVACY.md)
