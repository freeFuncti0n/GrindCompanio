#include "live_ws_server.h"
#include "live_telemetry.h"
#include "../config/constants.h"
#include "../controllers/grind_controller.h"
#include "../hardware/hardware_manager.h"
#include "../hardware/WeightSensor.h"
#include "../hardware/grinder.h"
#include "../bluetooth/manager.h"
#include <Arduino.h>

LiveWsServer live_ws_server;

LiveWsServer::LiveWsServer()
    : ws_(nullptr)
    , grind_controller_(nullptr)
    , hardware_manager_(nullptr)
    , bluetooth_(nullptr)
    , streaming_enabled_(false)
    , last_broadcast_ms_(0) {}

void LiveWsServer::init(AsyncWebServer* server,
                        GrindController* grind_controller,
                        HardwareManager* hardware_manager,
                        BluetoothManager* bluetooth) {
    grind_controller_ = grind_controller;
    hardware_manager_ = hardware_manager;
    bluetooth_ = bluetooth;

    if (!server || ws_) return;

    ws_ = new AsyncWebSocket(WIFI_WS_PATH);
    ws_->onEvent([this](AsyncWebSocket* s, AsyncWebSocketClient* c, AwsEventType type,
                        void* arg, uint8_t* data, size_t len) {
        this->on_ws_event(s, c, type, arg, data, len);
    });
    server->addHandler(ws_);
}

size_t LiveWsServer::client_count() const {
    return ws_ ? ws_->count() : 0;
}

void LiveWsServer::on_ws_event(AsyncWebSocket* server, AsyncWebSocketClient* client,
                               AwsEventType type, void* arg, uint8_t* data, size_t len) {
    (void)server;
    (void)arg;
    (void)data;
    (void)len;

    switch (type) {
        case WS_EVT_CONNECT:
            Serial.printf("Live WS: Client %u connected\n", client->id());
            streaming_enabled_ = true;
            break;
        case WS_EVT_DISCONNECT:
            Serial.printf("Live WS: Client %u disconnected\n", client->id());
            if (server->count() == 0) {
                streaming_enabled_ = false;
            }
            break;
        default:
            break;
    }
}

void LiveWsServer::handle() {
    if (!ws_) return;
    ws_->cleanupClients();
    broadcast_telemetry();
}

void LiveWsServer::broadcast_telemetry() {
    if (!ws_ || !streaming_enabled_ || ws_->count() == 0) return;
    if (bluetooth_ && (bluetooth_->is_updating() || bluetooth_->is_data_export_active())) return;
    if (!grind_controller_ || !grind_controller_->is_active()) return;

    unsigned long now = millis();
    if (now - last_broadcast_ms_ < BLE_LIVE_TELEMETRY_INTERVAL_MS) return;
    last_broadcast_ms_ = now;

    uint8_t payload[BLE_LIVE_PAYLOAD_BYTES];
    if (!build_live_telemetry_payload(grind_controller_, hardware_manager_, payload, sizeof(payload))) {
        return;
    }

    ws_->binaryAll(payload, BLE_LIVE_PAYLOAD_BYTES);
}
