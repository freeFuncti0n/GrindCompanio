# Flash WiFi firmware

**Kurzanleitung:** [Root-README](../../README.md)  
**Ausführlich:** [`smart-grind-by-weight/docs/WIFI_SETUP.md`](../../smart-grind-by-weight/docs/WIFI_SETUP.md)

## WLAN-Credentials

[`smart-grind-by-weight/src/config/wifi_credentials.h`](../../smart-grind-by-weight/src/config/wifi_credentials.h)

```cpp
#define WIFI_SSID "Your2.4GHzSSID"
#define WIFI_PASSWORD "YourPassword"
```

Danach neu bauen und flashen (PlatformIO upload oder esptool). Die vorkompilierte Release-`.bin` hat leere SSID/Passwort.

```powershell
cd smart-grind-by-weight
.\scripts\build-wifi-release.ps1
```

Prebuilt: `smart-grind-by-weight/release/`
