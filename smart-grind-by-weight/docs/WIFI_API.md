# WiFi LAN API (Grind Companion)

LAN-only REST + WebSocket control for the Grind Companion app. **No token authentication** — use only on trusted home networks.

Default HTTP port: **8080**  
WebSocket path: **`/ws/live`**

## Configure WiFi on the ESP32

### Option 1: NVS / Preferences (recommended)

Write credentials to the `wifi` namespace:

| Key | Type | Description |
|-----|------|-------------|
| `enabled` | bool | `true` (default) to enable WiFi at boot |
| `ssid` | string | Your WLAN SSID |
| `pass` | string | WLAN password |

Example via a one-off sketch or ESP-IDF `nvs_set`:

```
Namespace: wifi
ssid = "YourHomeSSID"
pass = "YourPassword"
enabled = true
```

### Option 2: Compile-time defaults (development)

In `platformio.ini` build flags:

```ini
build_flags =
    ...
    -DWIFI_COMPILE_SSID=\"MySSID\"
    -DWIFI_COMPILE_PASSWORD=\"MyPassword\"
```

NVS values override compile-time defaults when set.

After connect, the serial log prints the assigned IP. Use that address in the companion app **Connect → WiFi (LAN)**.

## REST endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/status` | WiFi state, IP, firmware build, feature flags |
| GET | `/api/features` | Alias of `/api/status` |
| GET | `/api/live/state` | JSON snapshot: weight, phase, motor, progress |
| POST | `/api/live/start` | Remote start grind (same as BLE `0x10`) |
| POST | `/api/live/stop` | Remote stop (`0x11`) |
| POST | `/api/live/purge` | Continue after purge confirm (`0x12`) |
| POST | `/api/live/idle` | Return to idle after complete (`0x13`) |
| GET | `/api/sessions` | JSON list of session IDs |
| GET | `/api/sessions/{id}` | Binary session file (same as BLE export) |

Example status response:

```json
{
  "wifi_connected": true,
  "ip": "192.168.1.42",
  "live_supported": true,
  "remote_supported": true,
  "ws_path": "/ws/live",
  "build": 123,
  "version": "1.x.x",
  "hostname": "grindbyweight"
}
```

## WebSocket live telemetry

Connect to `ws://<ip>:8080/ws/live`.

While a grind is active, the server broadcasts **20-byte binary frames** at ~20 Hz — identical layout to the BLE live telemetry characteristic (3× float + 5× uint8).

## Architecture notes

- HTTP handlers enqueue remote commands on a shared FreeRTOS queue; the **UI task** executes them (same path as BLE).
- BLE remains available; WiFi runs in parallel when connected.
- OTA or BLE data export blocks new remote commands (HTTP 503).

## Companion apps

### Configure WiFi on the ESP (important)

**Edit this file only:** [`src/config/wifi_credentials.h`](../src/config/wifi_credentials.h)

```cpp
#define WIFI_SSID "Your2.4GHzSSID"
#define WIFI_PASSWORD "YourPassword"
```

Then rebuild/flash. Step-by-step: [`WIFI_SETUP.md`](WIFI_SETUP.md)  
Prebuilt binaries (empty SSID): [`release/`](../release/)

### Native app (BLE + WiFi)

In **Connect**, choose **WiFi (LAN)**, enter the grinder IP. BLE remains available.

### Web app on NAS (WiFi only)

See [`grind-companion-webapp/`](../../grind-companion-webapp/README.md).


