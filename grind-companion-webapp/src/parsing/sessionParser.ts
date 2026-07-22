import {
  EVENT_STRUCT_SIZE,
  HEADER_SIZE,
  LOG_SCHEMA_VERSION,
  MEASUREMENT_STRUCT_SIZE,
  PHASE_NAMES,
  SESSION_STRUCT_SIZE,
  type GrindEvent,
  type GrindMeasurement,
  type GrindSession,
  type LiveTelemetry,
  type ParsedSessionFile,
} from './types';

function toDataView(data: Uint8Array | ArrayBuffer): DataView {
  if (data instanceof ArrayBuffer) {
    return new DataView(data);
  }
  return new DataView(data.buffer, data.byteOffset, data.byteLength);
}

function readU32(view: DataView, offset: number): number {
  return view.getUint32(offset, true);
}

function readI32(view: DataView, offset: number): number {
  return view.getInt32(offset, true);
}

function readF32(view: DataView, offset: number): number {
  return view.getFloat32(offset, true);
}

function readU16(view: DataView, offset: number): number {
  return view.getUint16(offset, true);
}

function readU8(view: DataView, offset: number): number {
  return view.getUint8(offset);
}

function readCString(bytes: Uint8Array, start: number, length: number): string {
  const slice = bytes.subarray(start, start + length);
  let end = slice.length;
  for (let i = 0; i < slice.length; i++) {
    if (slice[i] === 0) {
      end = i;
      break;
    }
  }
  return String.fromCharCode(...slice.subarray(0, end));
}

/**
 * Parse a single session file as exported over BLE.
 * Layout: [Header 24][GrindSession 80][Events 44×N][Measurements 24×M]
 */
export function parseSessionFile(
  data: Uint8Array,
  expectedSessionId: number
): ParsedSessionFile {
  if (data.byteLength < HEADER_SIZE + SESSION_STRUCT_SIZE) {
    throw new Error(`File data too small: ${data.byteLength} bytes`);
  }

  const view = toDataView(data);
  let offset = 0;
  const hdrSessionId = readU32(view, offset);
  const hdrSessionTs = readU32(view, offset + 4);
  const hdrSessionSize = readU32(view, offset + 8);
  const hdrChecksum = readU32(view, offset + 12);
  const eventCount = readU16(view, offset + 16);
  const measurementCount = readU16(view, offset + 18);
  const schemaVersion = readU16(view, offset + 20);
  offset += HEADER_SIZE;

  if (hdrSessionId !== expectedSessionId) {
    throw new Error(
      `Header session ID mismatch: expected ${expectedSessionId}, got ${hdrSessionId}`
    );
  }

  if (schemaVersion !== LOG_SCHEMA_VERSION) {
    console.warn(
      `Session ${expectedSessionId} uses schema ${schemaVersion}, expected ${LOG_SCHEMA_VERSION}`
    );
  }

  const parsedSessionId = readU32(view, offset);
  if (parsedSessionId !== expectedSessionId) {
    throw new Error(
      `Session ID mismatch: expected ${expectedSessionId}, got ${parsedSessionId}`
    );
  }

  const resultStatus = readCString(data, offset + 64, 16);

  const session: GrindSession = {
    session_id: parsedSessionId,
    session_timestamp: readU32(view, offset + 4) || hdrSessionTs,
    target_time_ms: readU32(view, offset + 8),
    total_time_ms: readU32(view, offset + 12),
    total_motor_on_time_ms: readU32(view, offset + 16),
    time_error_ms: readI32(view, offset + 20),
    target_weight: readF32(view, offset + 24),
    tolerance: readF32(view, offset + 28),
    final_weight: readF32(view, offset + 32),
    error_grams: readF32(view, offset + 36),
    start_weight: readF32(view, offset + 40),
    latency_to_coast_ratio: readF32(view, offset + 48),
    flow_rate_threshold: readF32(view, offset + 52),
    profile_id: readU8(view, offset + 56),
    grind_mode: readU8(view, offset + 57),
    max_pulse_attempts: readU8(view, offset + 58),
    pulse_count: readU8(view, offset + 59),
    termination_reason: readU8(view, offset + 60),
    schema_version: schemaVersion,
    result_status: resultStatus,
    session_size_bytes: hdrSessionSize,
    checksum: hdrChecksum,
  };

  offset += SESSION_STRUCT_SIZE;

  const events: GrindEvent[] = [];
  let expectedEventSequence = 0;

  for (let i = 0; i < eventCount; i++) {
    if (offset + EVENT_STRUCT_SIZE > data.byteLength) {
      throw new Error(`File too small for event at offset ${offset}`);
    }
    const timestampMs = readU32(view, offset);
    const phaseId = readU8(view, offset + 40);
    const eventSequenceId = readU16(view, offset + 36);

    if (timestampMs === 0xffffffff || phaseId === 0xff) {
      expectedEventSequence += 1;
      offset += EVENT_STRUCT_SIZE;
      continue;
    }

    if (eventSequenceId !== expectedEventSequence) {
      throw new Error(
        `Event sequence out of order: expected ${expectedEventSequence}, got ${eventSequenceId}`
      );
    }

    events.push({
      session_id: parsedSessionId,
      timestamp_ms: timestampMs,
      duration_ms: readU32(view, offset + 4),
      grind_latency_ms: readU32(view, offset + 8),
      settling_duration_ms: readU32(view, offset + 12),
      start_weight: readF32(view, offset + 16),
      end_weight: readF32(view, offset + 20),
      motor_stop_target_weight: readF32(view, offset + 24),
      pulse_duration_ms: readF32(view, offset + 28),
      pulse_flow_rate: readF32(view, offset + 32),
      event_sequence_id: eventSequenceId,
      loop_count: readU16(view, offset + 38),
      phase_id: phaseId,
      phase_name: PHASE_NAMES[phaseId] ?? 'UNKNOWN',
      pulse_attempt_number: readU8(view, offset + 41),
      event_flags: readU8(view, offset + 42),
    });

    expectedEventSequence += 1;
    offset += EVENT_STRUCT_SIZE;
  }

  const measurements: GrindMeasurement[] = [];
  let expectedMeasurementSequence = 0;

  for (let i = 0; i < measurementCount; i++) {
    if (offset + MEASUREMENT_STRUCT_SIZE > data.byteLength) {
      throw new Error(`File too small for measurement at offset ${offset}`);
    }
    const timestampMs = readU32(view, offset);
    const weightGrams = readF32(view, offset + 4);
    const sequenceId = readU16(view, offset + 20);
    const phaseId = readU8(view, offset + 23);

    if (timestampMs === 0xffffffff || weightGrams === -999.0) {
      expectedMeasurementSequence += 1;
      offset += MEASUREMENT_STRUCT_SIZE;
      continue;
    }

    if (sequenceId !== expectedMeasurementSequence) {
      throw new Error(
        `Session ${parsedSessionId} corrupted: measurement sequence error at index ${i}`
      );
    }

    measurements.push({
      session_id: parsedSessionId,
      sequence_id: sequenceId,
      timestamp_ms: timestampMs,
      weight_grams: weightGrams,
      weight_delta: readF32(view, offset + 8),
      flow_rate_g_per_s: readF32(view, offset + 12),
      motor_stop_target_weight: readF32(view, offset + 16),
      motor_is_on: readU8(view, offset + 22),
      phase_id: phaseId,
      phase_name: PHASE_NAMES[phaseId] ?? 'UNKNOWN',
    });

    expectedMeasurementSequence += 1;
    offset += MEASUREMENT_STRUCT_SIZE;
  }

  return { session, events, measurements };
}

/** Parse 20-byte live telemetry notify payload */
export function parseLiveTelemetry(data: Uint8Array): LiveTelemetry {
  if (data.byteLength < 17) {
    throw new Error(`Live telemetry too short: ${data.byteLength}`);
  }
  const view = toDataView(data);
  return {
    weight_g: readF32(view, 0),
    flow_g_s: readF32(view, 4),
    target_g: readF32(view, 8),
    progress_pct: readU8(view, 12),
    phase_id: readU8(view, 13),
    profile_id: readU8(view, 14),
    grind_mode: readU8(view, 15),
    motor_on: readU8(view, 16),
  };
}
