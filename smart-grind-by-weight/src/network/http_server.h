#pragma once

#include <ESPAsyncWebServer.h>
#include <cstdint>

class GrindController;
class HardwareManager;
class BluetoothManager;
class WifiManager;
class LiveWsServer;
class DataStreamManager;

/**
 * HttpServer — LAN REST API for remote grind control and session export.
 */
class HttpServer {
public:
    HttpServer();

    void init(WifiManager* wifi,
              BluetoothManager* bluetooth,
              GrindController* grind_controller,
              HardwareManager* hardware_manager,
              LiveWsServer* live_ws,
              DataStreamManager* data_stream);

    void begin();
    void handle();

    bool is_running() const { return running_; }
    AsyncWebServer* get_server() { return server_; }

private:
    WifiManager* wifi_;
    BluetoothManager* bluetooth_;
    GrindController* grind_controller_;
    HardwareManager* hardware_manager_;
    LiveWsServer* live_ws_;
    DataStreamManager* data_stream_;

    AsyncWebServer* server_;
    bool running_;

    bool can_accept_remote_command() const;
    void enqueue_live_action(uint8_t action);
    void register_routes();
    String build_status_json() const;
    String build_live_state_json() const;
    String build_sessions_json() const;
};

extern HttpServer http_server;
