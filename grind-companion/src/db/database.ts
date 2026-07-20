import * as SQLite from 'expo-sqlite';
import type { GrindEvent, GrindMeasurement, GrindSession } from '../parsing/types';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('grinder_data.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS grind_sessions (
          session_id INTEGER PRIMARY KEY,
          session_timestamp INTEGER,
          profile_id INTEGER,
          grind_mode INTEGER,
          target_weight REAL,
          target_time_ms INTEGER,
          tolerance REAL,
          final_weight REAL,
          start_weight REAL,
          error_grams REAL,
          time_error_ms INTEGER,
          total_time_ms INTEGER,
          total_motor_on_time_ms INTEGER,
          pulse_count INTEGER,
          max_pulse_attempts INTEGER,
          termination_reason INTEGER,
          latency_to_coast_ratio REAL,
          flow_rate_threshold REAL,
          schema_version INTEGER,
          result_status TEXT,
          session_size_bytes INTEGER,
          checksum INTEGER
        );
        CREATE TABLE IF NOT EXISTS grind_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER,
          timestamp_ms INTEGER,
          phase_id INTEGER,
          phase_name TEXT,
          pulse_attempt_number INTEGER,
          event_sequence_id INTEGER,
          duration_ms INTEGER,
          start_weight REAL,
          end_weight REAL,
          motor_stop_target_weight REAL,
          pulse_duration_ms REAL,
          grind_latency_ms INTEGER,
          settling_duration_ms INTEGER,
          pulse_flow_rate REAL,
          loop_count INTEGER,
          event_flags INTEGER
        );
        CREATE TABLE IF NOT EXISTS grind_measurements (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER,
          sequence_id INTEGER,
          timestamp_ms INTEGER,
          weight_grams REAL,
          weight_delta REAL,
          flow_rate_g_per_s REAL,
          motor_is_on INTEGER,
          phase_id INTEGER,
          phase_name TEXT,
          motor_stop_target_weight REAL
        );
        CREATE INDEX IF NOT EXISTS idx_events_session ON grind_events(session_id);
        CREATE INDEX IF NOT EXISTS idx_meas_session ON grind_measurements(session_id);
        CREATE TABLE IF NOT EXISTS beans (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          roaster TEXT,
          origin TEXT,
          roast_level REAL,
          created_at INTEGER NOT NULL
        );
        CREATE TABLE IF NOT EXISTS session_meta (
          session_id INTEGER PRIMARY KEY,
          bean_id INTEGER,
          grind_setting REAL,
          grind_note TEXT,
          basket TEXT,
          brew_time_s REAL,
          yield_g REAL,
          taste_score INTEGER,
          notes TEXT,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (bean_id) REFERENCES beans(id)
        );
        CREATE INDEX IF NOT EXISTS idx_session_meta_bean ON session_meta(bean_id);
      `);
      return db;
    })();
  }
  return dbPromise;
}

export async function getExistingSessionIds(): Promise<Set<number>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ session_id: number }>(
    'SELECT session_id FROM grind_sessions'
  );
  return new Set(rows.map((r) => r.session_id));
}

export async function upsertParsedSession(
  session: GrindSession,
  events: GrindEvent[],
  measurements: GrindMeasurement[]
): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM grind_events WHERE session_id = ?', session.session_id);
    await db.runAsync('DELETE FROM grind_measurements WHERE session_id = ?', session.session_id);
    await db.runAsync('DELETE FROM grind_sessions WHERE session_id = ?', session.session_id);

    await db.runAsync(
      `INSERT INTO grind_sessions (
        session_id, session_timestamp, profile_id, grind_mode, target_weight, target_time_ms,
        tolerance, final_weight, start_weight, error_grams, time_error_ms, total_time_ms,
        total_motor_on_time_ms, pulse_count, max_pulse_attempts, termination_reason,
        latency_to_coast_ratio, flow_rate_threshold, schema_version, result_status,
        session_size_bytes, checksum
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        session.session_id,
        session.session_timestamp,
        session.profile_id,
        session.grind_mode,
        session.target_weight,
        session.target_time_ms,
        session.tolerance,
        session.final_weight,
        session.start_weight,
        session.error_grams,
        session.time_error_ms,
        session.total_time_ms,
        session.total_motor_on_time_ms,
        session.pulse_count,
        session.max_pulse_attempts,
        session.termination_reason,
        session.latency_to_coast_ratio,
        session.flow_rate_threshold,
        session.schema_version,
        session.result_status,
        session.session_size_bytes,
        session.checksum,
      ]
    );

    for (const e of events) {
      await db.runAsync(
        `INSERT INTO grind_events (
          session_id, timestamp_ms, phase_id, phase_name, pulse_attempt_number, event_sequence_id,
          duration_ms, start_weight, end_weight, motor_stop_target_weight, pulse_duration_ms,
          grind_latency_ms, settling_duration_ms, pulse_flow_rate, loop_count, event_flags
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          e.session_id,
          e.timestamp_ms,
          e.phase_id,
          e.phase_name,
          e.pulse_attempt_number,
          e.event_sequence_id,
          e.duration_ms,
          e.start_weight,
          e.end_weight,
          e.motor_stop_target_weight,
          e.pulse_duration_ms,
          e.grind_latency_ms,
          e.settling_duration_ms,
          e.pulse_flow_rate,
          e.loop_count,
          e.event_flags,
        ]
      );
    }

    for (const m of measurements) {
      await db.runAsync(
        `INSERT INTO grind_measurements (
          session_id, sequence_id, timestamp_ms, weight_grams, weight_delta, flow_rate_g_per_s,
          motor_is_on, phase_id, phase_name, motor_stop_target_weight
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          m.session_id,
          m.sequence_id,
          m.timestamp_ms,
          m.weight_grams,
          m.weight_delta,
          m.flow_rate_g_per_s,
          m.motor_is_on,
          m.phase_id,
          m.phase_name,
          m.motor_stop_target_weight,
        ]
      );
    }
  });
}

export async function listSessions(): Promise<GrindSession[]> {
  const db = await getDatabase();
  return db.getAllAsync<GrindSession>(
    'SELECT * FROM grind_sessions ORDER BY session_timestamp DESC, session_id DESC'
  );
}

export async function getSession(sessionId: number): Promise<GrindSession | null> {
  const db = await getDatabase();
  return (
    (await db.getFirstAsync<GrindSession>(
      'SELECT * FROM grind_sessions WHERE session_id = ?',
      sessionId
    )) ?? null
  );
}

export async function getSessionEvents(sessionId: number): Promise<GrindEvent[]> {
  const db = await getDatabase();
  return db.getAllAsync<GrindEvent>(
    'SELECT * FROM grind_events WHERE session_id = ? ORDER BY timestamp_ms ASC',
    sessionId
  );
}

export async function getSessionMeasurements(
  sessionId: number
): Promise<GrindMeasurement[]> {
  const db = await getDatabase();
  return db.getAllAsync<GrindMeasurement>(
    'SELECT * FROM grind_measurements WHERE session_id = ? ORDER BY timestamp_ms ASC',
    sessionId
  );
}

export async function getLatestSession(): Promise<GrindSession | null> {
  const db = await getDatabase();
  return (
    (await db.getFirstAsync<GrindSession>(
      'SELECT * FROM grind_sessions ORDER BY session_timestamp DESC, session_id DESC LIMIT 1'
    )) ?? null
  );
}

// Journal / diagnose helpers live in platform-resolved modules under src/journal/
// Native: *Repo.ts uses getDatabase(); Web: *Repo.web.ts re-exports from database.web.ts
