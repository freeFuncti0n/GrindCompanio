# GrindCompanio

Erweiterung zu [smart-grind-by-weight](https://github.com/jaapp/smart-grind-by-weight) by Jaapp.

**Autor:** [freeFuncti0n](https://github.com/freeFuncti0n)

Monorepo: Companion-Apps + Firmware-Erweiterungen für Eureka Grind-by-Weight (ESP32-S3).

## Inhalt

| Ordner | Beschreibung |
|--------|--------------|
| [`grind-companion-webapp/`](grind-companion-webapp/) | **Web-App** (Vite/React) für Ugreen NAS / Docker — WiFi REST + WebSocket zum ESP |
| [`grind-companion-ios/`](grind-companion-ios/) | Expo/React-Native (Android + iOS): BLE + WiFi |
| [`smart-grind-by-weight/`](smart-grind-by-weight/) | ESP32-Firmware v1.4.0 + WiFi-API (Branch `firmware/v1.4.0-wifi`) |

## Branch: `firmware/v1.4.0-wifi`

Jaapp **v1.4.0** + LAN-Steuerung. Fertige Binaries: [`smart-grind-by-weight/release/`](smart-grind-by-weight/release/)

**WiFi einrichten — diese Datei bearbeiten:**

[`smart-grind-by-weight/src/config/wifi_credentials.h`](smart-grind-by-weight/src/config/wifi_credentials.h)

```cpp
#define WIFI_SSID "Dein2.4GHzWLAN"
#define WIFI_PASSWORD "DeinPasswort"
```

Anleitung: [`smart-grind-by-weight/docs/WIFI_SETUP.md`](smart-grind-by-weight/docs/WIFI_SETUP.md)


```powershell
cd grind-companion-webapp
npm install
npm run build
docker compose up -d --build
# → http://<nas-ip>:8088
```

ESP braucht die WiFi-Firmware (nicht Vanilla Jaapp). API: [`smart-grind-by-weight/docs/WIFI_API.md`](smart-grind-by-weight/docs/WIFI_API.md) · Flash: [`grind-companion-webapp/docs/FIRMWARE_WIFI_FLASH.md`](grind-companion-webapp/docs/FIRMWARE_WIFI_FLASH.md)

```
Browser ←UI← NAS:8088
Browser ←REST/WS→ ESP:8080  (gleiches 2,4‑GHz‑WLAN)
```

## Quick Start — Android-App (optional)

Siehe [`grind-companion-ios/README.md`](grind-companion-ios/README.md) und `dist/GrindCompanion-debug.apk`.

## Quick Start — Firmware

```powershell
cd smart-grind-by-weight
$env:PLATFORMIO_CORE_DIR = "$env:USERPROFILE\.platformio"
.\tools\venv\Scripts\python.exe -m platformio run -e waveshare-esp32s3-touch-amoled-164
```

## Upstream / Rechtliches

Firmware basiert auf **jaapp/smart-grind-by-weight** (GPL-3.0). Companion-Apps sind MIT (freeFuncti0n). Details: [LICENSE](LICENSE), [NOTICE](NOTICE), [DISCLAIMER.md](DISCLAIMER.md), [PRIVACY.md](PRIVACY.md).
