#include "live_telemetry.h"
#include "../config/constants.h"
#include "../controllers/grind_controller.h"
#include "../hardware/hardware_manager.h"
#include "../hardware/WeightSensor.h"
#include "../hardware/grinder.h"
#include <algorithm>
#include <cstring>

bool build_live_telemetry_payload(GrindController* grind_controller,
                                  HardwareManager* hardware_manager,
                                  uint8_t* payload,
                                  size_t payload_size) {
    if (!payload || payload_size < BLE_LIVE_PAYLOAD_BYTES) return false;
    if (!grind_controller || !hardware_manager) return false;
    if (!grind_controller->is_active()) return false;

    WeightSensor* sensor = hardware_manager->get_weight_sensor();
    Grinder* grinder = hardware_manager->get_grinder();
    if (!sensor) return false;

    float weight_g = sensor->get_weight_low_latency();
    float flow_g_s = grind_controller->get_current_flow_rate();
    float target_g = grind_controller->get_target_weight();
    uint8_t progress = static_cast<uint8_t>(std::clamp(grind_controller->get_progress_percent(), 0, 100));
    uint8_t phase_id = grind_controller->get_current_phase_id();
    uint8_t profile_id = grind_controller->get_profile_id();
    uint8_t grind_mode = static_cast<uint8_t>(grind_controller->get_mode());
    uint8_t motor_on = (grinder && grinder->is_grinding()) ? 1 : 0;

    memset(payload, 0, BLE_LIVE_PAYLOAD_BYTES);
    memcpy(payload + 0, &weight_g, sizeof(float));
    memcpy(payload + 4, &flow_g_s, sizeof(float));
    memcpy(payload + 8, &target_g, sizeof(float));
    payload[12] = progress;
    payload[13] = phase_id;
    payload[14] = profile_id;
    payload[15] = grind_mode;
    payload[16] = motor_on;

    return true;
}
