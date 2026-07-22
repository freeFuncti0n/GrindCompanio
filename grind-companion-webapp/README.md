# Grind Companion Web

Browser-UI für [smart-grind-by-weight](../smart-grind-by-weight) über **WiFi LAN** (REST + WebSocket).  
Läuft auf einer **Ugreen NAS** (Docker/Nginx) oder lokal. Der Browser spricht **direkt** mit dem ESP — die NAS liefert nur die statische UI.

**Autor:** [freeFuncti0n](https://github.com/freeFuncti0n) · **Lizenz:** MIT

> Die frühere iOS-/Android-App wird nicht weiterentwickelt. Diese Web-App ist der empfohlene Companion. Live-Daten kommen ausschließlich über WiFi, nicht über BLE.

## Architektur

```
Browser  --lädt UI-->  NAS :8088 (nginx)
Browser  --REST/WS-->  ESP :8080  (gleiches 2,4‑GHz‑LAN)
```

## Firmware zuerst

Vanilla Jaapp **v1.4.0 hat keine WiFi-API**.

1. SSID/Passwort in [`../smart-grind-by-weight/src/config/wifi_credentials.h`](../smart-grind-by-weight/src/config/wifi_credentials.h)
2. Bauen & flashen — Anleitung: [Root-README](../README.md) und [`../smart-grind-by-weight/docs/WIFI_SETUP.md`](../smart-grind-by-weight/docs/WIFI_SETUP.md)
3. IP aus Serial-Log notieren (`WiFi: Connected — IP …`)

## Lokal entwickeln

```bash
cd grind-companion-webapp
npm install
npm run dev
```

`http://localhost:5173` → **Connect** → ESP-IP.

## Docker (NAS)

```bash
cd grind-companion-webapp
docker compose up -d --build
```

URL: `http://<nas-ip>:8088` (HTTP, damit der Browser HTTP zum ESP darf).

## Features

| Tab / Seite | Funktion |
|-------------|----------|
| Connect | ESP-IP (`localStorage`), Status, Session-Sync |
| Grind | Live-Chart (WebSocket), Remote Start/Stop/Purge/Idle |
| Analytics | Sessions aus IndexedDB, Journal-Zusammenfassung |
| Session | Chart + Journal (Bohne, Dial, Bezugszeit, Ausgabe, Ratio, Score, Korb, Notizen) |
| Bohnen | Name, Röster, Herkunft |
| Diagnose | Dial-Aggregate, Hit-Rate, Empfehlungen (Ziel: Zeit/Ratio/Score) |

## Troubleshooting

| Problem | Lösung |
|---------|--------|
| Connect schlägt fehl | Gleiches WLAN/Band; WiFi-Firmware; IP; Port 8080 |
| Live leer | Grind aktiv für WS-Frames; `ws://<ip>:8080/ws/live` |
| Sync leer | Logging am ESP; HTTP 503 bei OTA/Export |
| HTTPS-UI + HTTP-ESP | NAS-UI per HTTP nutzen (v1) |

API: [`WIFI_API.md`](../smart-grind-by-weight/docs/WIFI_API.md)
