export const LOG_SCHEMA_VERSION = 2;
export const HEADER_SIZE = 24;
export const SESSION_STRUCT_SIZE = 80;
export const EVENT_STRUCT_SIZE = 44;
export const MEASUREMENT_STRUCT_SIZE = 24;

export const PROFILE_MAP: Record<number, string> = {
  0: 'SINGLE',
  1: 'DOUBLE',
  2: 'CUSTOM',
};

export const MODE_MAP: Record<number, string> = {
  0: 'WEIGHT',
  1: 'TIME',
};

export const TERMINATION_REASON_MAP: Record<number, string> = {
  0: 'COMPLETE',
  1: 'TIMEOUT',
  2: 'OVERSHOOT',
  3: 'MAX_PULSES',
  255: 'UNKNOWN',
};

export const PHASE_NAMES: Record<number, string> = {
  0: 'IDLE',
  1: 'INITIALIZING',
  2: 'SETUP',
  3: 'TARING',
  4: 'TARE_CONFIRM',
  5: 'PREDICTIVE',
  6: 'PULSE_DECISION',
  7: 'PULSE_EXECUTE',
  8: 'PULSE_SETTLING',
  9: 'FINAL_SETTLING',
  10: 'TIME_GRINDING',
  11: 'TIME_ADDITIONAL_PULSE',
  12: 'COMPLETED',
  13: 'TIMEOUT',
  14: 'PRIME',
  15: 'PRIME_SETTLING',
  16: 'PURGE_CONFIRM',
};

export interface GrindSession {
  session_id: number;
  session_timestamp: number;
  profile_id: number;
  grind_mode: number;
  target_weight: number;
  target_time_ms: number;
  tolerance: number;
  final_weight: number;
  start_weight: number;
  error_grams: number;
  time_error_ms: number;
  total_time_ms: number;
  total_motor_on_time_ms: number;
  pulse_count: number;
  max_pulse_attempts: number;
  termination_reason: number;
  latency_to_coast_ratio: number;
  flow_rate_threshold: number;
  schema_version: number;
  result_status: string;
  session_size_bytes: number;
  checksum: number;
}

export interface GrindEvent {
  session_id: number;
  timestamp_ms: number;
  phase_id: number;
  phase_name: string;
  pulse_attempt_number: number;
  event_sequence_id: number;
  duration_ms: number;
  start_weight: number;
  end_weight: number;
  motor_stop_target_weight: number;
  pulse_duration_ms: number;
  grind_latency_ms: number;
  settling_duration_ms: number;
  pulse_flow_rate: number;
  loop_count: number;
  event_flags: number;
}

export interface GrindMeasurement {
  session_id: number;
  sequence_id: number;
  timestamp_ms: number;
  weight_grams: number;
  weight_delta: number;
  flow_rate_g_per_s: number;
  motor_is_on: number;
  phase_id: number;
  phase_name: string;
  motor_stop_target_weight: number;
}

export interface ParsedSessionFile {
  session: GrindSession;
  events: GrindEvent[];
  measurements: GrindMeasurement[];
}

/** Live telemetry packed payload from Phase 2 firmware (20 bytes LE) */
export interface LiveTelemetry {
  weight_g: number;
  flow_g_s: number;
  target_g: number;
  progress_pct: number;
  phase_id: number;
  profile_id: number;
  grind_mode: number;
  motor_on: number;
}
