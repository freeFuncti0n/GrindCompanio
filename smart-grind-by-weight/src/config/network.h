#pragma once

//==============================================================================
// WiFi / LAN REST + WebSocket configuration (Grind Companion)
//==============================================================================
// >>> Edit WiFi SSID/password here:
#include "wifi_credentials.h"
//
// Or set Preferences namespace "wifi" keys "ssid" / "pass" / "enabled" in NVS.

#ifndef WIFI_COMPILE_SSID
#define WIFI_COMPILE_SSID ""
#endif

#ifndef WIFI_COMPILE_PASSWORD
#define WIFI_COMPILE_PASSWORD ""
#endif

#define WIFI_PREFS_NAMESPACE "wifi"
#define WIFI_PREF_SSID_KEY "ssid"
#define WIFI_PREF_PASS_KEY "pass"
#define WIFI_PREF_ENABLED_KEY "enabled"

#define WIFI_HTTP_PORT 8080
#define WIFI_WS_PATH "/ws/live"

#define WIFI_CONNECT_TIMEOUT_MS 15000
#define WIFI_RECONNECT_INTERVAL_MS 5000
#define WIFI_STA_HOSTNAME "grindbyweight"

// REST paths (LAN-only, no auth — Option A)
#define WIFI_API_STATUS "/api/status"
#define WIFI_API_LIVE_START "/api/live/start"
#define WIFI_API_LIVE_STOP "/api/live/stop"
#define WIFI_API_LIVE_PURGE "/api/live/purge"
#define WIFI_API_LIVE_IDLE "/api/live/idle"
#define WIFI_API_LIVE_STATE "/api/live/state"
#define WIFI_API_SESSIONS "/api/sessions"
