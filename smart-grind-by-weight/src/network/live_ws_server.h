#pragma once

#include <AsyncWebSocket.h>
#include <cstdint>

class GrindController;
class HardwareManager;
class BluetoothManager;

/**
 * LiveWsServer — broadcasts 20-byte binary telemetry frames (same as BLE).
 */
class LiveWsServer {
public:
    LiveWsServer();

    void init(AsyncWebServer* server,
              GrindController* grind_controller,
              HardwareManager* hardware_manager,
              BluetoothManager* bluetooth);

    void handle();
    void set_streaming_enabled(bool enabled) { streaming_enabled_ = enabled; }
    bool is_streaming_enabled() const { return streaming_enabled_; }
    size_t client_count() const;

private:
    // AsyncWebServer takes ownership of handlers passed to addHandler().
    AsyncWebSocket* ws_;
    GrindController* grind_controller_;
    HardwareManager* hardware_manager_;
    BluetoothManager* bluetooth_;
    bool streaming_enabled_;
    unsigned long last_broadcast_ms_;

    void on_ws_event(AsyncWebSocket* server, AsyncWebSocketClient* client,
                     AwsEventType type, void* arg, uint8_t* data, size_t len);
    void broadcast_telemetry();
};

extern LiveWsServer live_ws_server;
