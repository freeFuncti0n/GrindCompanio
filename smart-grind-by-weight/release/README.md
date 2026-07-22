# Release binaries â€” firmware/v1.4.0-wifi

Built from Jaapp **v1.4.0** + GrindCompanio WiFi LAN API.

| File | Flash offset |
|------|----------------|
| bootloader.bin | 0x0 |
| partitions.bin | 0x8000 |
| firmware-v1.4.0-wifi.bin | 0x320000 |

**WiFi credentials:** edit `src/config/wifi_credentials.h`, then re-run `scripts/build-wifi-release.ps1`.

Full guide: [docs/WIFI_SETUP.md](../docs/WIFI_SETUP.md)
