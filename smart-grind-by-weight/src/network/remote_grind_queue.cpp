#include "remote_grind_queue.h"

RemoteGrindQueue remote_grind_queue;

RemoteGrindQueue::RemoteGrindQueue() : queue_(nullptr) {}

RemoteGrindQueue::~RemoteGrindQueue() {
    if (queue_) {
        vQueueDelete(queue_);
        queue_ = nullptr;
    }
}

void RemoteGrindQueue::init() {
    if (!queue_) {
        queue_ = xQueueCreate(4, sizeof(RemoteGrindMessage));
    }
}

void RemoteGrindQueue::enqueue(uint8_t action) {
    if (!queue_) return;
    RemoteGrindMessage msg;
    msg.action = action;
    xQueueSend(queue_, &msg, 0);
}

bool RemoteGrindQueue::dequeue(uint8_t* out_action) {
    if (!queue_ || !out_action) return false;
    RemoteGrindMessage msg;
    if (xQueueReceive(queue_, &msg, 0) == pdPASS) {
        *out_action = msg.action;
        return true;
    }
    return false;
}
