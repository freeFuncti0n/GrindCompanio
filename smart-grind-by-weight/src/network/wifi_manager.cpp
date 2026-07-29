#include "wifi_manager.h"
#include "../config/constants.h"
#include <Arduino.h>

WifiManager wifi_manager;

WifiManager::WifiManager()
    : enabled_(false)
    , connected_(false)
    , connect_in_progress_(false)
    , last_reconnect_attempt_ms_(0) {
    ip_string_[0] = '\0';
}

void WifiManager::init() {
    enabled_ = true;
    if (!prefs_.begin(WIFI_PREFS_NAMESPACE, true)) {
        Serial.println("WiFi: Preferences unavailable, using enabled default");
        return;
    }

    enabled_ = prefs_.getBool(WIFI_PREF_ENABLED_KEY, true);
    prefs_.end();
}

void WifiManager::load_credentials(String& ssid, String& password) {
    ssid = "";
    password = "";

    if (prefs_.begin(WIFI_PREFS_NAMESPACE, true)) {
        ssid = prefs_.getString(WIFI_PREF_SSID_KEY, "");
        password = prefs_.getString(WIFI_PREF_PASS_KEY, "");
        prefs_.end();
    }

    if (ssid.length() == 0 && strlen(WIFI_COMPILE_SSID) > 0) {
        ssid = WIFI_COMPILE_SSID;
        password = WIFI_COMPILE_PASSWORD;
    }
}

void WifiManager::begin() {
    if (!enabled_) {
        Serial.println("WiFi: Disabled in preferences");
        return;
    }

    String ssid;
    String password;
    load_credentials(ssid, password);

    if (ssid.length() == 0) {
        Serial.println("WiFi: No SSID configured (set wifi.ssid in NVS or WIFI_COMPILE_SSID)");
        return;
    }

    WiFi.mode(WIFI_STA);
    WiFi.setHostname(WIFI_STA_HOSTNAME);
    WiFi.setAutoReconnect(true);
    WiFi.persistent(true);

    attempt_connect(ssid, password);
}

void WifiManager::attempt_connect(const String& ssid, const String& password) {
    if (connect_in_progress_) return;

    Serial.printf("WiFi: Connecting to \"%s\"...\n", ssid.c_str());
    connect_in_progress_ = true;
    WiFi.disconnect(true);
    delay(100);
    WiFi.begin(ssid.c_str(), password.c_str());
    last_reconnect_attempt_ms_ = millis();
}

void WifiManager::update_connection_state() {
    wl_status_t status = WiFi.status();
    bool now_connected = (status == WL_CONNECTED);

    if (now_connected && !connected_) {
        strlcpy(ip_string_, WiFi.localIP().toString().c_str(), sizeof(ip_string_));
        Serial.printf("WiFi: Connected — IP %s RSSI %d dBm\n", ip_string_, WiFi.RSSI());
    } else if (!now_connected && connected_) {
        ip_string_[0] = '\0';
        Serial.println("WiFi: Disconnected");
    }

    connected_ = now_connected;
    connect_in_progress_ = (status == WL_IDLE_STATUS || status == WL_DISCONNECTED) &&
                           (millis() - last_reconnect_attempt_ms_ < WIFI_CONNECT_TIMEOUT_MS);

    if (status == WL_CONNECT_FAILED || status == WL_NO_SSID_AVAIL) {
        connect_in_progress_ = false;
    }
}

void WifiManager::handle() {
    if (!enabled_) return;

    update_connection_state();

    if (connected_) {
        connect_in_progress_ = false;
        return;
    }

    unsigned long now = millis();
    if (connect_in_progress_) {
        if (now - last_reconnect_attempt_ms_ >= WIFI_CONNECT_TIMEOUT_MS) {
            connect_in_progress_ = false;
            Serial.println("WiFi: Connect timeout");
        }
        return;
    }

    if (now - last_reconnect_attempt_ms_ < WIFI_RECONNECT_INTERVAL_MS) {
        return;
    }

    String ssid;
    String password;
    load_credentials(ssid, password);
    if (ssid.length() > 0) {
        attempt_connect(ssid, password);
    }
}

int8_t WifiManager::get_rssi() const {
    return connected_ ? WiFi.RSSI() : 0;
}
