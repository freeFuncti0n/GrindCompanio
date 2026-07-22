# GrindCompanio

Erweiterung zu [smart-grind-by-weight](https://github.com/jaapp/smart-grind-by-weight) von Jaapp.

**Autor:** [freeFuncti0n](https://github.com/freeFuncti0n)

Monorepo: **Web-Companion** + ESP32-Firmware mit WiFi-LAN-API für Eureka Grind-by-Weight.

> **Hinweis:** Die frühere Expo-App (iOS/Android) wird nicht weiterentwickelt. Empfohlen ist die **Web-App** im Browser (NAS/Docker oder lokal). Live-Daten und Fernsteuerung laufen über **WiFi** (REST + WebSocket), nicht über BLE.

---

## Was brauche ich?

1. Waveshare ESP32-S3 Touch AMOLED (wie Upstream Jaapp)
2. Branch **`firmware/v1.4.0-wifi`** (oder die Release-Binaries darunter)
3. 2,4‑GHz‑WLAN (ESP32-S3 kann kein 5 GHz)
4. Optional: Browser-UI auf einer NAS (`grind-companion-webapp`)

---

## Firmware laden (Schritt für Schritt)

### 1. WiFi-Zugangsdaten setzen

**Nur diese Datei bearbeiten:**

[`smart-grind-by-weight/src/config/wifi_credentials.h`](smart-grind-by-weight/src/config/wifi_credentials.h)

```cpp
#define WIFI_SSID "Dein2.4GHzWLAN"
#define WIFI_PASSWORD "DeinPasswort"
```

Anführungszeichen behalten. Die mitgelieferte Release-`.bin` hat **leere** Credentials (keine Secrets im Repo) — ohne eigenen Build verbindet sich das Board nicht.

### 2. Bauen und flashen

**Option A — PlatformIO (empfohlen)**

```powershell
cd smart-grind-by-weight
$env:PLATFORMIO_CORE_DIR = "$env:USERPROFILE\.platformio"
.\tools\venv\Scripts\python.exe -m platformio run -e waveshare-esp32s3-touch-amoled-164 -t upload --upload-port COM8
```

`COM8` durch deinen USB-Port ersetzen (Geräte-Manager / `pio device list`).

**Option B — Release-Binary mit esptool** (nur sinnvoll, wenn du vorher mit deiner SSID neu gebaut und die `.bin` ersetzt hast)

```powershell
cd smart-grind-by-weight\release
esptool --chip esp32s3 --port COM8 --baud 460800 write-flash `
  0x0 bootloader.bin `
  0x8000 partitions.bin `
  0x320000 firmware-v1.4.0-wifi.bin
```

| Datei | Flash-Offset |
|-------|----------------|
| `bootloader.bin` | `0x0` |
| `partitions.bin` | `0x8000` |
| `firmware-v1.4.0-wifi.bin` | `0x320000` |

Dateien: [`smart-grind-by-weight/release/`](smart-grind-by-weight/release/)  
Build-Skript: [`smart-grind-by-weight/scripts/build-wifi-release.ps1`](smart-grind-by-weight/scripts/build-wifi-release.ps1)

### 3. Prüfen

1. Serial Monitor **115200** baud
2. Erwartete Zeilen: `WiFi: Connected — IP …`, `HTTP: Server started on port 8080`
3. Browser: `http://<ESP-IP>:8080/api/status`

Ausführlich: [`smart-grind-by-weight/docs/WIFI_SETUP.md`](smart-grind-by-weight/docs/WIFI_SETUP.md) · API: [`WIFI_API.md`](smart-grind-by-weight/docs/WIFI_API.md)

**Vanilla Jaapp v1.4.0 hat keine WiFi-API** — ohne diesen Fork funktioniert die Web-App nicht.

---

## Web-App starten

```
Browser  --lädt UI-->  NAS :8088 (nginx)
Browser  --REST/WS-->  ESP :8080  (gleiches 2,4‑GHz‑LAN)
```

```powershell
cd grind-companion-webapp
npm install
npm run build
docker compose up -d --build
# → http://<nas-ip>:8088
```

Lokal zum Entwickeln: `npm run dev` → `http://localhost:5173` → **Connect** → ESP-IP eintragen.

Details: [`grind-companion-webapp/README.md`](grind-companion-webapp/README.md)

### Features (Web)

| Bereich | Inhalt |
|---------|--------|
| Connect | ESP-IP, Status, Session-Sync |
| Grind | Live-Gewicht/Chart über **WebSocket**, Remote Start/Stop/Purge |
| Analytics | Sessions, Journal (Bohne, Dial, Bezugszeit, Ausgabe, Ratio, Score), Bohnen, Diagnose |

Journal und Diagnose nutzen die **gesyncten WiFi-Sessions** (Dosis = `final_weight`), nicht BLE.

---

## Repo-Struktur

| Ordner | Status |
|--------|--------|
| [`grind-companion-webapp/`](grind-companion-webapp/) | **Aktiv** — Browser-Companion (WiFi) |
| [`smart-grind-by-weight/`](smart-grind-by-weight/) | **Aktiv** — Firmware v1.4.0 + WiFi-API |
| [`grind-companion-ios/`](grind-companion-ios/) | **Eingestellt** — Expo BLE/WiFi, nicht empfohlen |
| `grind-companion/` | Legacy-Pfad (historisch) |

Branch: **`firmware/v1.4.0-wifi`**

---

## Upstream / Rechtliches

Firmware basiert auf **jaapp/smart-grind-by-weight** (GPL-3.0). Companion-Code ist MIT (freeFuncti0n).  
[LICENSE](LICENSE) · [NOTICE](NOTICE) · [DISCLAIMER.md](DISCLAIMER.md) · [PRIVACY.md](PRIVACY.md)
