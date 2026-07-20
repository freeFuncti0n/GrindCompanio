# GrindCompanio

Erweiterung zu [smart-grind-by-weight](https://github.com/jaapp/smart-grind-by-weight) by Jaapp.

Monorepo: **Companion-App** + **Firmware-Erweiterungen** für Eureka Grind-by-Weight (ESP32-S3).

## Inhalt

| Ordner | Beschreibung |
|--------|--------------|
| [`grind-companion/`](grind-companion/) | Expo/React-Native-App (iOS/Android): BLE-Sync, Analytics, Journal, Live-Grind, Remote-Start |
| [`smart-grind-by-weight/`](smart-grind-by-weight/) | ESP32-Firmware (Fork/Erweiterung): Live-Telemetrie, Remote-Grind über BLE |

## Features (Companion)

- **Connect** — BLE Scan/Pair mit `GrindByWeight`
- **Sync** — Session-Export über Data-Export-GATT (ohne Desktop-Python)
- **Analytics** — Sessions, Charts, Espresso-Tagebuch
- **Grind** — Live-Arc/Chart, Remote Start/Stop, Purge-Bestätigung (Phase-2-Firmware)
- **Web-Vorschau** — UI ohne BLE (`npm run web`)

## Features (Firmware-Erweiterung)

- Live-Telemetrie (~20 Hz während Grind) über BLE Live-Service
- Remote-Befehle auf `BLE_LIVE_CONTROL`: Start `0x10`, Stop `0x11`, Purge Continue `0x12`, Return Idle `0x13`
- UI-Task-Delegation (`handle_grind_button`) — kein Hängen in INITIALIZING

## Quick Start — App

```bash
cd grind-companion
npm install
npx expo prebuild
npx expo run:ios   # oder run:android — Dev Client nötig (kein Expo Go wegen BLE)
```

Web-Vorschau: `npm run web`

## Quick Start — Firmware

```bash
cd smart-grind-by-weight/tools
python3 grinder.py build
# Mock-Test ohne Mühle:
python3 venv/Scripts/python.exe -m platformio run --target upload -e waveshare-esp32s3-touch-amoled-164-mock
```

Siehe [`smart-grind-by-weight/docs/DEVELOPMENT.md`](smart-grind-by-weight/docs/DEVELOPMENT.md) für Details.

## Upstream

Firmware basiert auf **jaapp/smart-grind-by-weight**. Companion-App nutzt dasselbe BLE-Protokoll (`src/config/bluetooth.h`).

## Lizenz

Firmware: siehe Upstream-Repo. Companion-App: privates Projekt — siehe jeweilige Ordner.
