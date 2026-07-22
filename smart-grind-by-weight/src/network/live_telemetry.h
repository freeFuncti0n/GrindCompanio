#pragma once

#include <cstddef>
#include <cstdint>

class GrindController;
class HardwareManager;

/**
 * Build the 20-byte live telemetry payload (identical to BLE notify format).
 * @return true if payload was filled, false if sources unavailable
 */
bool build_live_telemetry_payload(GrindController* grind_controller,
                                  HardwareManager* hardware_manager,
                                  uint8_t* payload,
                                  size_t payload_size);
