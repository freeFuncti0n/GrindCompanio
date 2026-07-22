# GrindCompanio

An extension of [smart-grind-by-weight](https://github.com/jaapp/smart-grind-by-weight) by [jaapp](https://github.com/jaapp) and contributors.

**Author:** [freeFuncti0n](https://github.com/freeFuncti0n)

Browser companion for the Eureka Grind-by-Weight mod — live grinding, shot journaling, and dial tuning over **WiFi** (REST + WebSocket). No phone app required.

**Setup (flash firmware, Docker, first connection):** **[docs/DOC.md](docs/DOC.md)**

---

## What it does

GrindCompanio turns your grind-by-weight scale into a connected espresso workflow tool. The web app runs in any browser on your LAN; grind data stays on your device in **IndexedDB** (no cloud account).

### Live grinding

- Real-time weight curve and flow rate during each grind
- Remote **Start**, **Stop**, **Purge**, and **Idle** from the browser
- Session stats: target dose, final weight, error, events, and measurement samples

### Shot journal

Document every extraction alongside the grind session — your personal brew log:

- **Bean** (linked to your bean library or ad hoc)
- **Grind setting** (dial position)
- **Shot time**, **yield**, and automatic **dose / ratio**
- **Basket** (e.g. 18 g VST)
- **Taste score** (1–5)
- **Grind note** and free-form **notes** (channeling, adjustments, etc.)
- **Target hit** indicator when shot time, ratio, and score meet your goals
- Remembers your last journal entries as defaults for the next shot

### Bean library

- Save beans with name, roaster, and origin
- Reuse beans across sessions and filter analytics by bean

### Analytics

- Browse all synced grind sessions
- Quick overview of journal data per session (bean, dial, score, target hit)
- Open any session for the full weight chart and editable journal

### Diagnose

Dial tuning assistant based on your journal history:

- Aggregates shots by bean and grind setting
- **Hit rate** — how often you land inside your target window
- **Recommendations** — which dial settings perform best (needs at least 2 logged shots per setting)
- Configurable targets: shot time range, ratio range, minimum taste score

### Connect & sync

- Connect to the ESP on your **2.4 GHz Wi‑Fi** LAN by IP
- Pull grind session history from the device into the browser
- Live stream and remote control when WiFi firmware is active

### Languages

**German** and **English** — switch via the gear icon in the header.

---

## How it fits together

```
Browser  →  Web UI (NAS / PC / dev server)
Browser  →  ESP32 grinder (same LAN, port 8080)
```

The UI is static; your browser talks **directly** to the grinder. The NAS (or any host) only serves the app files.

---

## Acknowledgements

This project would not exist without **[smart-grind-by-weight](https://github.com/jaapp/smart-grind-by-weight)**.

**Thank you to [jaapp](https://github.com/jaapp)** for creating and maintaining the original firmware, hardware designs, and tooling — and to **all contributors** to that project for the open-source grind-by-weight ecosystem this fork builds on.

GrindCompanio adds a WiFi LAN API and browser companion on top of that foundation. The upstream project remains the core; this repo is a grateful extension, not a replacement.

---

## Repository

| Folder | Description |
|--------|-------------|
| [`grind-companion-webapp/`](grind-companion-webapp/) | Browser companion (React/Vite) + Docker |
| [`smart-grind-by-weight/`](smart-grind-by-weight/) | Firmware v1.4.0 + WiFi API + release binaries |
| [`docs/DOC.md`](docs/DOC.md) | Setup guide (hardware, flash, Docker, first use) |

Development and releases are on **`main`**.

---

## Upstream & legal

Firmware is based on **[jaapp/smart-grind-by-weight](https://github.com/jaapp/smart-grind-by-weight)** (GPL-3.0). Companion code is MIT (freeFuncti0n).

[LICENSE](LICENSE) · [NOTICE](NOTICE) · [DISCLAIMER.md](DISCLAIMER.md) · [PRIVACY.md](PRIVACY.md)
