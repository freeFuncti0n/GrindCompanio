#pragma once

#include <atomic>

// Coordinates terminal-session persistence between the control and file-I/O cores.
class SessionEndBarrier {
private:
    std::atomic<bool> end_queued_{false};
    std::atomic<bool> end_processed_{true};
    std::atomic<bool> return_to_idle_requested_{false};

public:
    void reset_without_session() {
        end_queued_.store(false);
        end_processed_.store(true);
        return_to_idle_requested_.store(false);
    }

    void prepare_for_session() {
        end_queued_.store(false);
        end_processed_.store(false);
        return_to_idle_requested_.store(false);
    }

    bool needs_end_queue() const {
        return !end_queued_.load() && !end_processed_.load();
    }

    void record_queue_result(bool queued) {
        if (queued) {
            end_queued_.store(true);
        }
    }

    void mark_end_processed() {
        end_processed_.store(true);
    }

    void request_return_to_idle() {
        return_to_idle_requested_.store(true);
    }

    bool take_ready_return_to_idle() {
        if (!end_processed_.load()) {
            return false;
        }
        return return_to_idle_requested_.exchange(false);
    }

    bool is_end_queued() const {
        return end_queued_.load();
    }

    bool is_end_processed() const {
        return end_processed_.load();
    }
};
