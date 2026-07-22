import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { GrindEvent, GrindMeasurement, GrindSession } from '../parsing/types';
import type {
  Bean,
  BeanRecommendation,
  DialAggRow,
  SessionMeta,
  SessionMetaInput,
  SessionMetaWithBean,
} from '../journal/types';
import { calcRatio, isTargetHit } from '../journal/types';

interface GrindCompanionDB extends DBSchema {
  sessions: {
    key: number;
    value: GrindSession;
  };
  events: {
    key: string;
    value: GrindEvent & { _key: string };
    indexes: { by_session: number };
  };
  measurements: {
    key: string;
    value: GrindMeasurement & { _key: string };
    indexes: { by_session: number };
  };
  beans: {
    key: number;
    value: Bean;
  };
  meta: {
    key: number;
    value: SessionMeta;
  };
  meta_kv: {
    key: string;
    value: { key: string; value: number };
  };
}

const DB_NAME = 'grind-companion-web';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<GrindCompanionDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<GrindCompanionDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('sessions', { keyPath: 'session_id' });
        const events = db.createObjectStore('events', { keyPath: '_key' });
        events.createIndex('by_session', 'session_id');
        const measurements = db.createObjectStore('measurements', { keyPath: '_key' });
        measurements.createIndex('by_session', 'session_id');
        db.createObjectStore('beans', { keyPath: 'id' });
        db.createObjectStore('meta', { keyPath: 'session_id' });
        db.createObjectStore('meta_kv', { keyPath: 'key' });
      },
    });
  }
  return dbPromise;
}

export async function getExistingSessionIds(): Promise<Set<number>> {
  const db = await getDb();
  const keys = await db.getAllKeys('sessions');
  return new Set(keys);
}

export async function upsertParsedSession(
  session: GrindSession,
  events: GrindEvent[],
  measurements: GrindMeasurement[]
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['sessions', 'events', 'measurements'], 'readwrite');

  await tx.objectStore('sessions').put(session);

  const existingEvents = await tx.objectStore('events').index('by_session').getAllKeys(session.session_id);
  for (const key of existingEvents) {
    await tx.objectStore('events').delete(key);
  }
  for (const e of events) {
    await tx.objectStore('events').put({
      ...e,
      _key: `${e.session_id}-${e.event_sequence_id}`,
    });
  }

  const existingMeas = await tx
    .objectStore('measurements')
    .index('by_session')
    .getAllKeys(session.session_id);
  for (const key of existingMeas) {
    await tx.objectStore('measurements').delete(key);
  }
  for (const m of measurements) {
    await tx.objectStore('measurements').put({
      ...m,
      _key: `${m.session_id}-${m.sequence_id}`,
    });
  }

  await tx.done;
}

export async function listSessions(): Promise<GrindSession[]> {
  const db = await getDb();
  const all = await db.getAll('sessions');
  return all.sort((a, b) => b.session_timestamp - a.session_timestamp);
}

export async function getSession(sessionId: number): Promise<GrindSession | undefined> {
  const db = await getDb();
  return db.get('sessions', sessionId);
}

export async function getEvents(sessionId: number): Promise<GrindEvent[]> {
  const db = await getDb();
  const rows = await db.getAllFromIndex('events', 'by_session', sessionId);
  return rows.sort((a, b) => a.event_sequence_id - b.event_sequence_id);
}

export async function getMeasurements(sessionId: number): Promise<GrindMeasurement[]> {
  const db = await getDb();
  const rows = await db.getAllFromIndex('measurements', 'by_session', sessionId);
  return rows.sort((a, b) => a.sequence_id - b.sequence_id);
}

async function nextBeanId(db: IDBPDatabase<GrindCompanionDB>): Promise<number> {
  const row = await db.get('meta_kv', 'nextBeanId');
  const next = (row?.value ?? 1) as number;
  await db.put('meta_kv', { key: 'nextBeanId', value: next + 1 });
  return next;
}

export async function listBeans(): Promise<Bean[]> {
  const db = await getDb();
  const all = await db.getAll('beans');
  return all.sort((a, b) => b.created_at - a.created_at);
}

export async function createBean(input: {
  name: string;
  roaster?: string | null;
  origin?: string | null;
  roast_level?: number | null;
}): Promise<Bean> {
  const db = await getDb();
  const id = await nextBeanId(db);
  const bean: Bean = {
    id,
    name: input.name.trim(),
    roaster: input.roaster?.trim() || null,
    origin: input.origin?.trim() || null,
    roast_level: input.roast_level ?? null,
    created_at: Math.floor(Date.now() / 1000),
  };
  await db.put('beans', bean);
  return bean;
}

export async function getSessionMeta(sessionId: number): Promise<SessionMeta | undefined> {
  const db = await getDb();
  return db.get('meta', sessionId);
}

export async function upsertSessionMeta(input: SessionMetaInput): Promise<void> {
  const db = await getDb();
  await db.put('meta', { ...input, updated_at: Math.floor(Date.now() / 1000) });
}

export async function getLastJournalDefaults(): Promise<{
  bean_id: number | null;
  grind_setting: number | null;
} | null> {
  const db = await getDb();
  const metas = await db.getAll('meta');
  const sorted = metas
    .filter((m) => m.bean_id != null || m.grind_setting != null)
    .sort((a, b) => b.updated_at - a.updated_at);
  const last = sorted[0];
  if (!last) return null;
  return { bean_id: last.bean_id, grind_setting: last.grind_setting };
}

export async function listSessionMetaWithBeans(): Promise<SessionMetaWithBean[]> {
  const db = await getDb();
  const metas = await db.getAll('meta');
  const beans = await db.getAll('beans');
  const beanMap = new Map(beans.map((b) => [b.id, b]));
  const sessions = await db.getAll('sessions');
  const doseMap = new Map(sessions.map((s) => [s.session_id, s.final_weight || s.target_weight]));

  return metas.map((m) => {
    const bean = m.bean_id != null ? beanMap.get(m.bean_id) : undefined;
    return {
      ...m,
      bean_name: bean?.name ?? null,
      bean_roaster: bean?.roaster ?? null,
      dose_g: doseMap.get(m.session_id) ?? null,
    };
  });
}

export async function getDialAggregates(): Promise<DialAggRow[]> {
  const rows = await listSessionMetaWithBeans();
  const groups = new Map<string, DialAggRow & { scoreSum: number; brewSum: number; ratioSum: number; scoreN: number; brewN: number; ratioN: number }>();

  for (const r of rows) {
    if (r.bean_id == null || r.grind_setting == null) continue;
    const key = `${r.bean_id}:${r.grind_setting}`;
    let g = groups.get(key);
    if (!g) {
      g = {
        bean_id: r.bean_id,
        bean_name: r.bean_name ?? `Bean ${r.bean_id}`,
        grind_setting: r.grind_setting,
        n: 0,
        avg_score: null,
        avg_brew_time_s: null,
        avg_ratio: null,
        hits: 0,
        scoreSum: 0,
        brewSum: 0,
        ratioSum: 0,
        scoreN: 0,
        brewN: 0,
        ratioN: 0,
      };
      groups.set(key, g);
    }
    g.n += 1;
    if (r.taste_score != null) {
      g.scoreSum += r.taste_score;
      g.scoreN += 1;
    }
    if (r.brew_time_s != null) {
      g.brewSum += r.brew_time_s;
      g.brewN += 1;
    }
    const ratio = calcRatio(r.yield_g, r.dose_g);
    if (ratio != null) {
      g.ratioSum += ratio;
      g.ratioN += 1;
    }
    if (
      isTargetHit({
        brew_time_s: r.brew_time_s,
        ratio,
        taste_score: r.taste_score,
      })
    ) {
      g.hits += 1;
    }
  }

  return [...groups.values()].map((g) => ({
    bean_id: g.bean_id,
    bean_name: g.bean_name,
    grind_setting: g.grind_setting,
    n: g.n,
    avg_score: g.scoreN ? g.scoreSum / g.scoreN : null,
    avg_brew_time_s: g.brewN ? g.brewSum / g.brewN : null,
    avg_ratio: g.ratioN ? g.ratioSum / g.ratioN : null,
    hits: g.hits,
  }));
}

export async function getBeanRecommendations(): Promise<BeanRecommendation[]> {
  const dials = await getDialAggregates();
  return dials
    .filter((d) => d.n >= 2)
    .map((d) => ({
      bean_id: d.bean_id,
      bean_name: d.bean_name,
      grind_setting: d.grind_setting,
      n: d.n,
      avg_score: d.avg_score,
      hit_rate: d.n ? d.hits / d.n : 0,
    }))
    .sort((a, b) => (b.avg_score ?? 0) - (a.avg_score ?? 0) || b.hit_rate - a.hit_rate);
}
