#pragma once

#include <freertos/FreeRTOS.h>
#include <freertos/queue.h>
#include <cstddef>
#include <cstdint>

struct RemoteGrindMessage {
    uint8_t action;
};

/**
 * Shared queue marshalling remote grind commands from BLE / WiFi to the UI task.
 */
class RemoteGrindQueue {
public:
    RemoteGrindQueue();
    ~RemoteGrindQueue();

    void init();
    void enqueue(uint8_t action);
    bool dequeue(uint8_t* out_action);

private:
    QueueHandle_t queue_;
};

extern RemoteGrindQueue remote_grind_queue;
