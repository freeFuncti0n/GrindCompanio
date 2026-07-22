#include "http_server.h"
#include "wifi_manager.h"
#include "live_ws_server.h"
#include "remote_grind_queue.h"
#include "../config/constants.h"
#include "../config/build_info.h"
#include "../controllers/grind_controller.h"
#include "../hardware/hardware_manager.h"
#include "../hardware/WeightSensor.h"
#include "../hardware/grinder.h"
#include "../bluetooth/manager.h"
#include "../bluetooth/data_stream.h"
#include "../logging/grind_logging.h"
#include <Arduino.h>
#include <LittleFS.h>
#include <cstring>

namespace {

void add_cors_headers(AsyncWebServerResponse* response) {
    response->addHeader("Access-Control-Allow-Origin", "*");
    response->addHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response->addHeader("Access-Control-Allow-Headers", "Content-Type");
}

}  // namespace

HttpServer http_server;

HttpServer::HttpServer()
    : wifi_(nullptr)
    , bluetooth_(nullptr)
    , grind_controller_(nullptr)
    , hardware_manager_(nullptr)
    , live_ws_(nullptr)
    , data_stream_(nullptr)
    , server_(nullptr)
    , running_(false) {}

void HttpServer::init(WifiManager* wifi,
                      BluetoothManager* bluetooth,
                      GrindController* grind_controller,
                      HardwareManager* hardware_manager,
                      LiveWsServer* live_ws,
                      DataStreamManager* data_stream) {
    wifi_ = wifi;
    bluetooth_ = bluetooth;
    grind_controller_ = grind_controller;
    hardware_manager_ = hardware_manager;
    live_ws_ = live_ws;
    data_stream_ = data_stream;
}

bool HttpServer::can_accept_remote_command() const {
    if (bluetooth_ && (bluetooth_->is_updating() || bluetooth_->is_data_export_active())) {
        return false;
    }
    return true;
}

void HttpServer::enqueue_live_action(uint8_t action) {
    if (!can_accept_remote_command()) return;
    remote_grind_queue.enqueue(action);
}

String HttpServer::build_status_json() const {
    bool wifi_connected = wifi_ && wifi_->is_connected();
    const char* ip = wifi_connected ? wifi_->get_ip_string() : "";

    return String("{")
        + "\"wifi_connected\":" + (wifi_connected ? "true" : "false") + ","
        + "\"ip\":\"" + ip + "\","
        + "\"live_supported\":true,"
        + "\"remote_supported\":true,"
        + "\"ws_path\":\"" WIFI_WS_PATH "\","
        + "\"build\":" + String(BUILD_NUMBER) + ","
        + "\"version\":\"" BUILD_FIRMWARE_VERSION "\","
        + "\"hostname\":\"" WIFI_STA_HOSTNAME "\""
        + "}";
}

String HttpServer::build_live_state_json() const {
    float weight_g = 0.0f;
    float flow_g_s = 0.0f;
    float target_g = 0.0f;
    uint8_t progress = 0;
    uint8_t phase_id = 0;
    uint8_t profile_id = 0;
    uint8_t grind_mode = 0;
    uint8_t motor_on = 0;
    bool active = false;

    if (grind_controller_) {
        active = grind_controller_->is_active();
        target_g = grind_controller_->get_target_weight();
        flow_g_s = grind_controller_->get_current_flow_rate();
        progress = static_cast<uint8_t>(grind_controller_->get_progress_percent());
        phase_id = grind_controller_->get_current_phase_id();
        profile_id = grind_controller_->get_profile_id();
        grind_mode = static_cast<uint8_t>(grind_controller_->get_mode());
    }

    if (hardware_manager_) {
        WeightSensor* sensor = hardware_manager_->get_weight_sensor();
        Grinder* grinder = hardware_manager_->get_grinder();
        if (sensor) {
            weight_g = sensor->get_weight_low_latency();
        }
        if (grinder) {
            motor_on = grinder->is_grinding() ? 1 : 0;
        }
    }

    return String("{")
        + "\"active\":" + (active ? "true" : "false") + ","
        + "\"weight_g\":" + String(weight_g, 2) + ","
        + "\"flow_g_s\":" + String(flow_g_s, 2) + ","
        + "\"target_g\":" + String(target_g, 2) + ","
        + "\"progress\":" + String(progress) + ","
        + "\"phase_id\":" + String(phase_id) + ","
        + "\"profile_id\":" + String(profile_id) + ","
        + "\"grind_mode\":" + String(grind_mode) + ","
        + "\"motor_on\":" + String(motor_on)
        + "}";
}

String HttpServer::build_sessions_json() const {
    if (!data_stream_) {
        return "{\"session_ids\":[]}";
    }

    const uint32_t max_sessions = 100;
    uint32_t session_ids[max_sessions];
    uint32_t count = data_stream_->get_session_list(session_ids, max_sessions);

    String json = "{\"session_ids\":[";
    for (uint32_t i = 0; i < count; i++) {
        if (i > 0) json += ",";
        json += String(session_ids[i]);
    }
    json += "],\"count\":" + String(count) + "}";
    return json;
}

void HttpServer::register_routes() {
    if (!server_) return;

    server_->on(WIFI_API_STATUS, HTTP_GET, [this](AsyncWebServerRequest* request) {
        AsyncWebServerResponse* response = request->beginResponse(200, "application/json", build_status_json());
        add_cors_headers(response);
        request->send(response);
    });

    server_->on("/api/features", HTTP_GET, [this](AsyncWebServerRequest* request) {
        AsyncWebServerResponse* response = request->beginResponse(200, "application/json", build_status_json());
        add_cors_headers(response);
        request->send(response);
    });

    auto make_live_handler = [this](uint8_t action) {
        return [this, action](AsyncWebServerRequest* request) {
            if (!can_accept_remote_command()) {
                AsyncWebServerResponse* response = request->beginResponse(
                    503, "application/json", "{\"ok\":false,\"error\":\"busy\"}");
                add_cors_headers(response);
                request->send(response);
                return;
            }
            enqueue_live_action(action);
            AsyncWebServerResponse* response =
                request->beginResponse(200, "application/json", "{\"ok\":true}");
            add_cors_headers(response);
            request->send(response);
        };
    };

    server_->on(WIFI_API_LIVE_START, HTTP_POST, make_live_handler(BLE_LIVE_CMD_START_GRIND));
    server_->on(WIFI_API_LIVE_STOP, HTTP_POST, make_live_handler(BLE_LIVE_CMD_STOP_GRIND));
    server_->on(WIFI_API_LIVE_PURGE, HTTP_POST, make_live_handler(BLE_LIVE_CMD_CONTINUE_PURGE));
    server_->on(WIFI_API_LIVE_IDLE, HTTP_POST, make_live_handler(BLE_LIVE_CMD_RETURN_IDLE));

    server_->on(WIFI_API_LIVE_STATE, HTTP_GET, [this](AsyncWebServerRequest* request) {
        AsyncWebServerResponse* response = request->beginResponse(200, "application/json", build_live_state_json());
        add_cors_headers(response);
        request->send(response);
    });

    server_->on(WIFI_API_SESSIONS, HTTP_GET, [this](AsyncWebServerRequest* request) {
        AsyncWebServerResponse* response = request->beginResponse(200, "application/json", build_sessions_json());
        add_cors_headers(response);
        request->send(response);
    });

    // Session file by ID — parsed from URL (no ASYNCWEBSERVER_REGEX needed)
    server_->onNotFound([this](AsyncWebServerRequest* request) {
        if (request->method() == HTTP_OPTIONS) {
            AsyncWebServerResponse* response = request->beginResponse(204);
            add_cors_headers(response);
            request->send(response);
            return;
        }

        const String url = request->url();
        const String prefix = String(WIFI_API_SESSIONS) + "/";
        if (request->method() == HTTP_GET && url.startsWith(prefix)) {
            String id_str = url.substring(prefix.length());
            // Strip query string if present
            int q = id_str.indexOf('?');
            if (q >= 0) id_str = id_str.substring(0, q);

            bool digits_only = id_str.length() > 0;
            for (unsigned i = 0; i < id_str.length(); i++) {
                if (!isDigit(id_str[i])) {
                    digits_only = false;
                    break;
                }
            }
            if (!digits_only) {
                AsyncWebServerResponse* response =
                    request->beginResponse(400, "application/json", "{\"error\":\"invalid session id\"}");
                add_cors_headers(response);
                request->send(response);
                return;
            }

            uint32_t session_id = static_cast<uint32_t>(id_str.toInt());
            char filename[64];
            snprintf(filename, sizeof(filename), SESSION_FILE_FORMAT, session_id);

            if (!LittleFS.exists(filename)) {
                AsyncWebServerResponse* response =
                    request->beginResponse(404, "application/json", "{\"error\":\"session not found\"}");
                add_cors_headers(response);
                request->send(response);
                return;
            }

            request->send(LittleFS, filename, "application/octet-stream");
            return;
        }

        request->send(404, "application/json", "{\"error\":\"not found\"}");
    });
}

void HttpServer::begin() {
    if (running_) return;
    if (!wifi_ || !wifi_->is_connected()) return;

    server_ = new AsyncWebServer(WIFI_HTTP_PORT);
    register_routes();

    if (live_ws_ && server_) {
        live_ws_->init(server_, grind_controller_, hardware_manager_, bluetooth_);
    }

    server_->begin();
    running_ = true;
    Serial.printf("HTTP: Server started on port %d\n", WIFI_HTTP_PORT);
}

void HttpServer::handle() {
    if (!wifi_ || !wifi_->is_enabled()) return;

    if (wifi_->is_connected()) {
        if (!running_) {
            begin();
        }
        if (live_ws_) {
            live_ws_->handle();
        }
    } else if (running_ && server_) {
        if (live_ws_) {
            live_ws_->reset_attachment();
        }
        server_->end();
        delete server_;
        server_ = nullptr;
        running_ = false;
        Serial.println("HTTP: Server stopped (WiFi disconnected)");
    }
}
