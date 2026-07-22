# WiFi einrichten (v1.4.0 + LAN API)

Diese Anleitung gilt für die GrindCompanio-Firmware auf **`main`**: Jaapp-Basis **v1.4.0** plus WiFi (REST + WebSocket auf Port **8080**).

## Welche Datei bearbeiten?

**Nur diese eine Datei:**

[`src/config/wifi_credentials.h`](../src/config/wifi_credentials.h)

```cpp
#define WIFI_SSID "Dein2.4GHzWLAN"
#define WIFI_PASSWORD "DeinPasswort"
```

- Nur **2,4 GHz** (ESP32-S3 hat kein 5 GHz)
- Anführungszeichen beibehalten
- Danach **neu bauen und flashen** (die fertige `.bin` ohne deine SSID verbindet sich nicht)

## Fertige Firmware flashen (ohne neu zu bauen)

Vorgebaute Dateien liegen unter [`release/`](../release/):

| Datei | Bedeutung |
|-------|-----------|
| `firmware-v1.4.0-wifi.bin` | App-Image (Offset **0x320000** bei Delta-OTA-Partition) |
| `bootloader.bin` | Bootloader |
| `partitions.bin` | Partitionstabelle |

### Option A — PlatformIO (empfohlen nach SSID-Änderung)

```powershell
cd smart-grind-by-weight

# 1) wifi_credentials.h bearbeiten
# 2) Bauen + flashen:
$env:PLATFORMIO_CORE_DIR = "$env:USERPROFILE\.platformio"
.\tools\venv\Scripts\python.exe -m platformio run -e waveshare-esp32s3-touch-amoled-164 -t upload --upload-port COM8
```

COM-Port anpassen (`COM8` → dein Port).

### Option B — esptool (Release-Binary)

```powershell
cd smart-grind-by-weight\release
esptool --chip esp32s3 --port COM8 --baud 460800 write-flash `
  0x0 bootloader.bin `
  0x8000 partitions.bin `
  0x320000 firmware-v1.4.0-wifi.bin
```

**Hinweis:** Die mitgelieferte Release-`.bin` hat **leere** `WIFI_SSID`/`WIFI_PASSWORD` (keine Secrets im Repo). Für WLAN-Betrieb: `wifi_credentials.h` setzen → neu bauen → flashen.

Hilfsskript: [`scripts/build-wifi-release.ps1`](../scripts/build-wifi-release.ps1)

## Nach dem Flash

1. Serial Monitor **115200** baud öffnen
2. Erwartete Zeilen:
   - `WiFi: Connecting to "…"`
   - `WiFi: Connected — IP 192.168.x.x`
   - `HTTP: Server started on port 8080`
3. Im Router optional DHCP-Reservation setzen
4. Test: Browser → `http://<ESP-IP>:8080/api/status`
5. Web-UI: [`grind-companion-webapp`](../../grind-companion-webapp/README.md) auf der NAS → Connect → IP eintragen

## API-Kurzüberblick

| Method | Path | Zweck |
|--------|------|--------|
| GET | `/api/status` | IP, Build, Features |
| POST | `/api/live/start` … `/idle` | Remote-Grind |
| GET | `/api/sessions` | Session-Liste |
| WS | `ws://<ip>:8080/ws/live` | Live-Telemetrie (20 Byte) |

Vollständig: [`WIFI_API.md`](WIFI_API.md)

## Troubleshooting

| Problem | Lösung |
|---------|--------|
| `No SSID configured` | `wifi_credentials.h` ausfüllen und **neu** flashen |
| Verbindet nicht | 2,4 GHz prüfen, SSID/Passwort, Nähe zum AP |
| Keine HTTP-Antwort | WiFi muss connected sein; Port 8080 im LAN freigeben |
| Vanilla Jaapp | Ohne diese GrindCompanio-Firmware gibt es **keine** WiFi-API |
