#pragma once

//==============================================================================
// WiFi credentials — EDIT THIS FILE before building/flashing
//==============================================================================
// Board: Waveshare ESP32-S3 (2.4 GHz WiFi only — 5 GHz will not work)
//
// 1. Set WIFI_SSID and WIFI_PASSWORD below
// 2. Rebuild:  pio run -e waveshare-esp32s3-touch-amoled-164
// 3. Flash:    pio run -e waveshare-esp32s3-touch-amoled-164 -t upload
//
// Details: docs/WIFI_SETUP.md
//==============================================================================

#ifndef WIFI_SSID
#define WIFI_SSID ""
#endif

#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD ""
#endif

// Aliases used by wifi_manager (do not rename)
#ifndef WIFI_COMPILE_SSID
#define WIFI_COMPILE_SSID WIFI_SSID
#endif

#ifndef WIFI_COMPILE_PASSWORD
#define WIFI_COMPILE_PASSWORD WIFI_PASSWORD
#endif
