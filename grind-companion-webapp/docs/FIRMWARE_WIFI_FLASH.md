# Flash WiFi firmware

**Primary guide (branch `firmware/v1.4.0-wifi`):**  
[`smart-grind-by-weight/docs/WIFI_SETUP.md`](../../smart-grind-by-weight/docs/WIFI_SETUP.md)

## File to edit for WLAN

[`smart-grind-by-weight/src/config/wifi_credentials.h`](../../smart-grind-by-weight/src/config/wifi_credentials.h)

```cpp
#define WIFI_SSID "Your2.4GHzSSID"
#define WIFI_PASSWORD "YourPassword"
```

Then rebuild:

```powershell
cd smart-grind-by-weight
.\scripts\build-wifi-release.ps1
# flash via PlatformIO upload or esptool — see WIFI_SETUP.md
```

Prebuilt binaries (empty SSID): `smart-grind-by-weight/release/`
