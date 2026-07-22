# Privacy (Grind Companion Web)

Last updated: 2026

## Summary

The **web app** stores data **locally in the browser** (IndexedDB). There is
**no cloud backend** from this project and **no tracking** by the project authors.

## What data is processed?

| Data | Where | Purpose |
|------|--------|---------|
| Grind sessions (weight, flow, timings) | Browser IndexedDB | Analytics, session details |
| Espresso journal (bean, dial, notes) | Browser IndexedDB | Analysis, diagnose |
| ESP IP address | Browser `localStorage` | Connection to the grinder ESP |
| Language (DE/EN) | Browser `localStorage` | UI language |

## Networking

The web app talks **directly** to your ESP on the local Wi‑Fi (HTTP port 8080,
WebSocket for live data). This traffic does **not** go through the project
author’s servers — only between browser and grinder on the LAN.

If the UI is hosted on a NAS, the browser only loads static files (HTML/JS/CSS)
from there. API requests still go directly to the ESP.

## What we do not do

- No upload to the project author’s servers
- No analytics / crash-reporting SDK (as of this codebase)
- No third-party sharing by the web app itself

## Firmware & BLE

The ESP firmware may still use **Bluetooth** (OTA, on-device export).
The web app uses **Wi‑Fi**, not BLE. Browser Bluetooth permissions are
not required for this web app.

## Your rights

You can delete all local data by:

- Clearing site data / IndexedDB in the browser, or
- Using a private window without persistence

## Contact

Project: https://github.com/freeFuncti0n/GrindCompanio

For privacy questions: open an issue in the GitHub repository.
