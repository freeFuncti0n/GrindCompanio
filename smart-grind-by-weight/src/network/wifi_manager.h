#pragma once

#include <Preferences.h>
#include <WiFi.h>
#include <cstdint>

/**
 * WiFiManager — STA mode connect with NVS or compile-time credentials and reconnect.
 */
class WifiManager {
public:
    WifiManager();

    void init();
    void begin();
    void handle();

    bool is_enabled() const { return enabled_; }
    bool is_connected() const { return connected_; }
    const char* get_ip_string() const { return ip_string_; }
    int8_t get_rssi() const;

private:
    Preferences prefs_;
    bool enabled_;
    bool connected_;
    bool connect_in_progress_;
    unsigned long last_reconnect_attempt_ms_;
    char ip_string_[16];

    void load_credentials(String& ssid, String& password);
    void update_connection_state();
    void attempt_connect(const String& ssid, const String& password);
};

extern WifiManager wifi_manager;
