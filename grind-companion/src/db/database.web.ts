/**
 * Web in-memory store with demo sessions + journal for UI preview.
 */
import type { GrindEvent, GrindMeasurement, GrindSession } from '../parsing/types';
import type {
  Bean,
  BeanRecommendation,
  DialAggRow,
  SessionMeta,
  SessionMetaInput,
  SessionMetaWithBean,
} from '../journal/types';
import {
  isTargetHit,
} from '../journal/types';

type Store = {
  sessions: Map<number, GrindSession>;
  events: Map<number, GrindEvent[]>;
  measurements: Map<number, GrindMeasurement[]>;
  beans: Map<number, Bean>;
  meta: Map<number, SessionMeta>;
  nextBeanId: number;
};

function buildDemoMeasurements(sessionId: number, target: number): GrindMeasurement[] {
  const out: GrindMeasurement[] = [];
  const durationMs = 9000;
  const steps = 90;
  for (let i = 0; i < steps; i++) {
    const t = (i / (steps - 1)) * durationMs;
    const progress = i / (steps - 1);
    const weight = Math.min(
      target,
      target * (1 - Math.exp(-3.2 * progress)) + (Math.random() - 0.5) * 0.04
    );
    const flow = progress < 0.85 ? 1.1 + Math.sin(progress * 8) * 0.15 : 0.2;
    out.push({
      session_id: sessionId,
      sequence_id: i,
      timestamp_ms: Math.round(t),
      weight_grams: Number(weight.toFixed(3)),
      weight_delta: i === 0 ? 0 : 0.02,
      flow_rate_g_per_s: Number(flow.toFixed(3)),
      motor_is_on: progress < 0.82 ? 1 : 0,
      phase_id: progress < 0.7 ? 5 : progress < 0.9 ? 7 : 9,
      phase_name:
        progress < 0.7 ? 'PREDICTIVE' : progress < 0.9 ? 'PULSE_EXECUTE' : 'FINAL_SETTLING',
      motor_stop_target_weight: target - 0.5,
    });
  }
  return out;
}

function createDemoStore(): Store {
  const sessions = new Map<number, GrindSession>();
  const events = new Map<number, GrindEvent[]>();
  const measurements = new Map<number, GrindMeasurement[]>();
  const beans = new Map<number, Bean>();
  const meta = new Map<number, SessionMeta>();

  beans.set(1, {
    id: 1,
    name: 'Ethiopia Yirgacheffe',
    roaster: 'Demo Roaster',
    origin: 'Ethiopia',
    roast_level: 3,
    created_at: Math.floor(Date.now() / 1000) - 86400,
  });
  beans.set(2, {
    id: 2,
    name: 'Brazil Cerrado',
    roaster: 'Demo Roaster',
    origin: 'Brazil',
    roast_level: 4,
    created_at: Math.floor(Date.now() / 1000) - 172800,
  });

  const demos: GrindSession[] = [
    {
      session_id: 101,
      session_timestamp: Math.floor(Date.now() / 1000) - 3600,
      profile_id: 1,
      grind_mode: 0,
      target_weight: 18,
      target_time_ms: 0,
      tolerance: 0.03,
      final_weight: 18.02,
      start_weight: 0,
      error_grams: -0.02,
      time_error_ms: 0,
      total_time_ms: 9200,
      total_motor_on_time_ms: 7800,
      pulse_count: 2,
      max_pulse_attempts: 5,
      termination_reason: 0,
      latency_to_coast_ratio: 0.55,
      flow_rate_threshold: 0.5,
      schema_version: 2,
      result_status: 'COMPLETE',
      session_size_bytes: 0,
      checksum: 0,
    },
    {
      session_id: 100,
      session_timestamp: Math.floor(Date.now() / 1000) - 7200,
      profile_id: 0,
      grind_mode: 0,
      target_weight: 9,
      target_time_ms: 0,
      tolerance: 0.03,
      final_weight: 9.05,
      start_weight: 0,
      error_grams: -0.05,
      time_error_ms: 0,
      total_time_ms: 5100,
      total_motor_on_time_ms: 4300,
      pulse_count: 1,
      max_pulse_attempts: 5,
      termination_reason: 0,
      latency_to_coast_ratio: 0.55,
      flow_rate_threshold: 0.5,
      schema_version: 2,
      result_status: 'COMPLETE',
      session_size_bytes: 0,
      checksum: 0,
    },
    {
      session_id: 99,
      session_timestamp: Math.floor(Date.now() / 1000) - 10800,
      profile_id: 1,
      grind_mode: 0,
      target_weight: 18,
      target_time_ms: 0,
      tolerance: 0.03,
      final_weight: 18.0,
      start_weight: 0,
      error_grams: 0,
      time_error_ms: 0,
      total_time_ms: 8800,
      total_motor_on_time_ms: 7500,
      pulse_count: 1,
      max_pulse_attempts: 5,
      termination_reason: 0,
      latency_to_coast_ratio: 0.55,
      flow_rate_threshold: 0.5,
      schema_version: 2,
      result_status: 'COMPLETE',
      session_size_bytes: 0,
      checksum: 0,
    },
  ];

  for (const session of demos) {
    sessions.set(session.session_id, session);
    events.set(session.session_id, []);
    measurements.set(
      session.session_id,
      buildDemoMeasurements(session.session_id, session.target_weight)
    );
  }

  const now = Math.floor(Date.now() / 1000);
  meta.set(101, {
    session_id: 101,
    bean_id: 1,
    grind_setting: 3.5,
    grind_note: null,
    basket: '18g VST',
    brew_time_s: 28,
    yield_g: 36,
    taste_score: 4,
    notes: 'Süß, klar',
    updated_at: now - 3600,
  });
  meta.set(100, {
    session_id: 100,
    bean_id: 1,
    grind_setting: 3.0,
    grind_note: null,
    basket: null,
    brew_time_s: 34,
    yield_g: 18,
    taste_score: 3,
    notes: 'Etwas bitter',
    updated_at: now - 7200,
  });
  meta.set(99, {
    session_id: 99,
    bean_id: 1,
    grind_setting: 3.5,
    grind_note: null,
    basket: '18g VST',
    brew_time_s: 27,
    yield_g: 36.5,
    taste_score: 5,
    notes: null,
    updated_at: now - 10800,
  });

  return { sessions, events, measurements, beans, meta, nextBeanId: 3 };
}

const store = createDemoStore();

export async function getExistingSessionIds(): Promise<Set<number>> {
  return new Set(store.sessions.keys());
}

export async function upsertParsedSession(
  session: GrindSession,
  sessionEvents: GrindEvent[],
  sessionMeasurements: GrindMeasurement[]
): Promise<void> {
  store.sessions.set(session.session_id, session);
  store.events.set(session.session_id, sessionEvents);
  store.measurements.set(session.session_id, sessionMeasurements);
}

export async function listSessions(): Promise<GrindSession[]> {
  return Array.from(store.sessions.values()).sort(
    (a, b) => b.session_timestamp - a.session_timestamp || b.session_id - a.session_id
  );
}

export async function getSession(sessionId: number): Promise<GrindSession | null> {
  return store.sessions.get(sessionId) ?? null;
}

export async function getSessionEvents(sessionId: number): Promise<GrindEvent[]> {
  return store.events.get(sessionId) ?? [];
}

export async function getSessionMeasurements(
  sessionId: number
): Promise<GrindMeasurement[]> {
  return store.measurements.get(sessionId) ?? [];
}

export async function getLatestSession(): Promise<GrindSession | null> {
  const list = await listSessions();
  return list[0] ?? null;
}

function enrichMeta(m: SessionMeta): SessionMetaWithBean {
  const bean = m.bean_id != null ? store.beans.get(m.bean_id) : null;
  const session = store.sessions.get(m.session_id);
  return {
    ...m,
    bean_name: bean?.name ?? null,
    bean_roaster: bean?.roaster ?? null,
    dose_g: session?.final_weight ?? null,
  };
}

export async function listBeans(): Promise<Bean[]> {
  return Array.from(store.beans.values()).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );
}

export async function getBean(id: number): Promise<Bean | null> {
  return store.beans.get(id) ?? null;
}

export async function createBean(input: {
  name: string;
  roaster?: string | null;
  origin?: string | null;
  roast_level?: number | null;
}): Promise<number> {
  const id = store.nextBeanId++;
  store.beans.set(id, {
    id,
    name: input.name.trim(),
    roaster: input.roaster?.trim() || null,
    origin: input.origin?.trim() || null,
    roast_level: input.roast_level ?? null,
    created_at: Math.floor(Date.now() / 1000),
  });
  return id;
}

export async function updateBean(
  id: number,
  input: {
    name: string;
    roaster?: string | null;
    origin?: string | null;
    roast_level?: number | null;
  }
): Promise<void> {
  const existing = store.beans.get(id);
  if (!existing) return;
  store.beans.set(id, {
    ...existing,
    name: input.name.trim(),
    roaster: input.roaster?.trim() || null,
    origin: input.origin?.trim() || null,
    roast_level: input.roast_level ?? null,
  });
}

export async function deleteBean(id: number): Promise<void> {
  for (const [sid, m] of store.meta) {
    if (m.bean_id === id) {
      store.meta.set(sid, { ...m, bean_id: null });
    }
  }
  store.beans.delete(id);
}

export async function getSessionMeta(sessionId: number): Promise<SessionMeta | null> {
  return store.meta.get(sessionId) ?? null;
}

export async function getSessionMetaWithBean(
  sessionId: number
): Promise<SessionMetaWithBean | null> {
  const m = store.meta.get(sessionId);
  return m ? enrichMeta(m) : null;
}

export async function listSessionMetaBySessionIds(
  sessionIds: number[]
): Promise<Map<number, SessionMetaWithBean>> {
  const map = new Map<number, SessionMetaWithBean>();
  for (const id of sessionIds) {
    const m = store.meta.get(id);
    if (m) map.set(id, enrichMeta(m));
  }
  return map;
}

export async function upsertSessionMeta(input: SessionMetaInput): Promise<void> {
  store.meta.set(input.session_id, {
    ...input,
    updated_at: Math.floor(Date.now() / 1000),
  });
}

export async function getLastJournalDefaults(): Promise<{
  bean_id: number | null;
  grind_setting: number | null;
} | null> {
  const rows = Array.from(store.meta.values())
    .filter((m) => m.bean_id != null || m.grind_setting != null)
    .sort((a, b) => b.updated_at - a.updated_at);
  const top = rows[0];
  if (!top) return null;
  return { bean_id: top.bean_id, grind_setting: top.grind_setting };
}

export async function getDialAggregates(beanId?: number | null): Promise<DialAggRow[]> {
  type Acc = {
    bean_id: number;
    bean_name: string;
    grind_setting: number;
    scores: number[];
    times: number[];
    ratios: number[];
    hits: number;
  };
  const groups = new Map<string, Acc>();

  for (const m of store.meta.values()) {
    if (m.bean_id == null || m.grind_setting == null) continue;
    if (beanId != null && m.bean_id !== beanId) continue;
    const bean = store.beans.get(m.bean_id);
    if (!bean) continue;
    const session = store.sessions.get(m.session_id);
    const dose = session?.final_weight ?? null;
    const ratio =
      m.yield_g != null && dose != null && dose > 0 ? m.yield_g / dose : null;
    const key = `${m.bean_id}:${m.grind_setting}`;
    let acc = groups.get(key);
    if (!acc) {
      acc = {
        bean_id: m.bean_id,
        bean_name: bean.name,
        grind_setting: m.grind_setting,
        scores: [],
        times: [],
        ratios: [],
        hits: 0,
      };
      groups.set(key, acc);
    }
    if (m.taste_score != null) acc.scores.push(m.taste_score);
    if (m.brew_time_s != null) acc.times.push(m.brew_time_s);
    if (ratio != null) acc.ratios.push(ratio);
    if (
      isTargetHit({
        brew_time_s: m.brew_time_s,
        ratio,
        taste_score: m.taste_score,
      })
    ) {
      acc.hits += 1;
    }
  }

  return Array.from(groups.values())
    .map((acc) => ({
      bean_id: acc.bean_id,
      bean_name: acc.bean_name,
      grind_setting: acc.grind_setting,
      n: Math.max(acc.scores.length, acc.times.length, 1),
      avg_score:
        acc.scores.length > 0
          ? acc.scores.reduce((a, b) => a + b, 0) / acc.scores.length
          : null,
      avg_brew_time_s:
        acc.times.length > 0
          ? acc.times.reduce((a, b) => a + b, 0) / acc.times.length
          : null,
      avg_ratio:
        acc.ratios.length > 0
          ? acc.ratios.reduce((a, b) => a + b, 0) / acc.ratios.length
          : null,
      hits: acc.hits,
    }))
    .map((row) => ({
      ...row,
      n: Array.from(store.meta.values()).filter(
        (m) => m.bean_id === row.bean_id && m.grind_setting === row.grind_setting
      ).length,
    }))
    .sort(
      (a, b) =>
        a.bean_name.localeCompare(b.bean_name) || a.grind_setting - b.grind_setting
    );
}

export async function getBeanRecommendations(): Promise<BeanRecommendation[]> {
  const rows = await getDialAggregates(null);
  const byBean = new Map<number, DialAggRow[]>();
  for (const row of rows) {
    const list = byBean.get(row.bean_id) ?? [];
    list.push(row);
    byBean.set(row.bean_id, list);
  }
  const recommendations: BeanRecommendation[] = [];
  for (const [, dials] of byBean) {
    const eligible = dials.filter((d) => d.n >= 3);
    const pool = eligible.length > 0 ? eligible : [...dials];
    pool.sort((a, b) => {
      const scoreA = a.avg_score ?? -1;
      const scoreB = b.avg_score ?? -1;
      if (scoreB !== scoreA) return scoreB - scoreA;
      const hitA = a.n > 0 ? a.hits / a.n : 0;
      const hitB = b.n > 0 ? b.hits / b.n : 0;
      if (hitB !== hitA) return hitB - hitA;
      return b.n - a.n;
    });
    const best = pool[0];
    if (!best) continue;
    recommendations.push({
      bean_id: best.bean_id,
      bean_name: best.bean_name,
      grind_setting: best.grind_setting,
      n: best.n,
      avg_score: best.avg_score,
      hit_rate: best.n > 0 ? best.hits / best.n : 0,
    });
  }
  return recommendations.sort((a, b) => a.bean_name.localeCompare(b.bean_name));
}
