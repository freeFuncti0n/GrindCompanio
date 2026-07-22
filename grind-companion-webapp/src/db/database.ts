import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { GrindEvent, GrindMeasurement, GrindSession } from '../parsing/types';
import type {
  Bean,
  BeanRecommendation,
  DialAggRow,
  JournalEntry,
  JournalEntryInput,
  JournalEntryUpdate,
  JournalEntryWithBean,
} from '../journal/types';
import {
  calcExtractionYield,
  calcRatio,
  dialGroupKey,
  dialGroupLabel,
  effectiveDose,
  isDialInHit,
  isScaExtractionHit,
} from '../journal/types';

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
    value: {
      session_id: number;
      bean_id: number | null;
      grind_setting: number | null;
      grind_note: string | null;
      basket: string | null;
      brew_time_s: number | null;
      yield_g: number | null;
      taste_score: number | null;
      notes: string | null;
      updated_at: number;
    };
  };
  journal_entries: {
    key: number;
    value: JournalEntry;
    indexes: { by_session: number };
  };
  meta_kv: {
    key: string;
    value: { key: string; value: number };
  };
}

const DB_NAME = 'grind-companion-web';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<GrindCompanionDB>> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB<GrindCompanionDB>(DB_NAME, DB_VERSION, {
      async upgrade(db, oldVersion, _newVersion, transaction) {
        if (oldVersion < 1) {
          db.createObjectStore('sessions', { keyPath: 'session_id' });
          const events = db.createObjectStore('events', { keyPath: '_key' });
          events.createIndex('by_session', 'session_id');
          const measurements = db.createObjectStore('measurements', { keyPath: '_key' });
          measurements.createIndex('by_session', 'session_id');
          db.createObjectStore('beans', { keyPath: 'id' });
          db.createObjectStore('meta', { keyPath: 'session_id' });
          db.createObjectStore('meta_kv', { keyPath: 'key' });
        }

        if (oldVersion < 2) {
          const journal = db.createObjectStore('journal_entries', { keyPath: 'id' });
          journal.createIndex('by_session', 'session_id');

          if (oldVersion >= 1 && transaction) {
            const metas = await transaction.objectStore('meta').getAll();
            let nextId = 1;
            for (const m of metas) {
              await transaction.objectStore('journal_entries').put({
                id: nextId++,
                session_id: m.session_id,
                title: null,
                bean_id: m.bean_id,
                grind_setting: m.grind_setting,
                grind_note: m.grind_note,
                basket: m.basket,
                dose_g: null,
                brew_time_s: m.brew_time_s,
                yield_g: m.yield_g,
                tds_pct: null,
                taste_score: m.taste_score,
                notes: m.notes,
                created_at: m.updated_at,
                updated_at: m.updated_at,
              });
            }
            await transaction.objectStore('meta_kv').put({ key: 'nextJournalId', value: nextId });
          }
        }
      },
    });
  }
  return dbPromise;
}

function enrichJournalRows(
  entries: JournalEntry[],
  beans: Bean[],
  sessions: GrindSession[]
): JournalEntryWithBean[] {
  const beanMap = new Map(beans.map((b) => [b.id, b]));
  const doseMap = new Map(
    sessions.map((s) => [s.session_id, s.final_weight || s.target_weight])
  );

  return entries.map((e) => {
    const bean = e.bean_id != null ? beanMap.get(e.bean_id) : undefined;
    return {
      ...e,
      bean_name: bean?.name ?? null,
      bean_roaster: bean?.roaster ?? null,
      session_dose_g: e.session_id != null ? (doseMap.get(e.session_id) ?? null) : null,
    };
  });
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
  const tx = db.transaction(['meta_kv', 'beans'], 'readwrite');
  const counters = tx.objectStore('meta_kv');
  const row = await counters.get('nextBeanId');
  const id = row?.value ?? 1;
  await counters.put({ key: 'nextBeanId', value: id + 1 });
  const bean: Bean = {
    id,
    name: input.name.trim(),
    roaster: input.roaster?.trim() || null,
    origin: input.origin?.trim() || null,
    roast_level: input.roast_level ?? null,
    created_at: Math.floor(Date.now() / 1000),
  };
  await tx.objectStore('beans').add(bean);
  await tx.done;
  return bean;
}

export async function listJournalEntries(): Promise<JournalEntryWithBean[]> {
  const db = await getDb();
  const [entries, beans, sessions] = await Promise.all([
    db.getAll('journal_entries'),
    db.getAll('beans'),
    db.getAll('sessions'),
  ]);
  return enrichJournalRows(entries, beans, sessions).sort((a, b) => b.updated_at - a.updated_at);
}

export async function getJournalEntry(id: number): Promise<JournalEntryWithBean | undefined> {
  const db = await getDb();
  const entry = await db.get('journal_entries', id);
  if (!entry) return undefined;
  const [beans, sessions] = await Promise.all([db.getAll('beans'), db.getAll('sessions')]);
  return enrichJournalRows([entry], beans, sessions)[0];
}

export async function getJournalBySessionId(sessionId: number): Promise<JournalEntryWithBean | undefined> {
  const db = await getDb();
  const rows = await db.getAllFromIndex('journal_entries', 'by_session', sessionId);
  const entry = rows[0];
  if (!entry) return undefined;
  const [beans, sessions] = await Promise.all([db.getAll('beans'), db.getAll('sessions')]);
  return enrichJournalRows([entry], beans, sessions)[0];
}

export async function createJournalEntry(
  input: Omit<JournalEntryInput, 'session_id'> & { session_id?: number | null }
): Promise<JournalEntry> {
  const db = await getDb();
  const tx = db.transaction(['meta_kv', 'journal_entries'], 'readwrite');
  const counters = tx.objectStore('meta_kv');
  const row = await counters.get('nextJournalId');
  const id = row?.value ?? 1;
  await counters.put({ key: 'nextJournalId', value: id + 1 });
  const now = Math.floor(Date.now() / 1000);
  const entry: JournalEntry = {
    id,
    session_id: input.session_id ?? null,
    title: input.title?.trim() || null,
    bean_id: input.bean_id ?? null,
    grind_setting: input.grind_setting ?? null,
    grind_note: input.grind_note?.trim() || null,
    basket: input.basket?.trim() || null,
    dose_g: input.dose_g ?? null,
    brew_time_s: input.brew_time_s ?? null,
    yield_g: input.yield_g ?? null,
    tds_pct: input.tds_pct ?? null,
    taste_score: input.taste_score ?? null,
    notes: input.notes?.trim() || null,
    created_at: now,
    updated_at: now,
  };
  await tx.objectStore('journal_entries').add(entry);
  await tx.done;
  return entry;
}

export async function updateJournalEntry(input: JournalEntryUpdate): Promise<JournalEntry> {
  const db = await getDb();
  const existing = await db.get('journal_entries', input.id);
  if (!existing) {
    throw new Error(`Journal entry ${input.id} not found`);
  }
  const updated: JournalEntry = {
    ...existing,
    ...input,
    title: input.title !== undefined ? input.title?.trim() || null : existing.title,
    grind_note: input.grind_note !== undefined ? input.grind_note?.trim() || null : existing.grind_note,
    basket: input.basket !== undefined ? input.basket?.trim() || null : existing.basket,
    notes: input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
    updated_at: Math.floor(Date.now() / 1000),
  };
  await db.put('journal_entries', updated);
  return updated;
}

export async function upsertJournalForSession(
  sessionId: number,
  input: Omit<JournalEntryInput, 'id' | 'session_id' | 'created_at' | 'updated_at'>
): Promise<JournalEntry> {
  const existing = await getJournalBySessionId(sessionId);
  if (existing) {
    return updateJournalEntry({ id: existing.id, ...input, session_id: sessionId });
  }
  return createJournalEntry({ ...input, session_id: sessionId });
}

export async function deleteJournalEntry(id: number): Promise<void> {
  const db = await getDb();
  await db.delete('journal_entries', id);
}

export async function getLastJournalDefaults(): Promise<{
  bean_id: number | null;
  grind_setting: number | null;
  dose_g: number | null;
  basket: string | null;
} | null> {
  const entries = await listJournalEntries();
  const last = entries.find(
    (e) =>
      e.bean_id != null ||
      e.grind_setting != null ||
      e.dose_g != null ||
      e.basket != null
  );
  if (!last) return null;
  return {
    bean_id: last.bean_id,
    grind_setting: last.grind_setting,
    dose_g: last.dose_g ?? last.session_dose_g,
    basket: last.basket,
  };
}

/** @deprecated Use listJournalEntries */
export async function listSessionMetaWithBeans(): Promise<JournalEntryWithBean[]> {
  return listJournalEntries().then((rows) =>
    rows.filter((r) => r.session_id != null).sort((a, b) => b.updated_at - a.updated_at)
  );
}

/** @deprecated Use getJournalBySessionId */
export async function getSessionMeta(sessionId: number) {
  const entry = await getJournalBySessionId(sessionId);
  if (!entry) return undefined;
  return {
    session_id: sessionId,
    bean_id: entry.bean_id,
    grind_setting: entry.grind_setting,
    grind_note: entry.grind_note,
    basket: entry.basket,
    brew_time_s: entry.brew_time_s,
    yield_g: entry.yield_g,
    taste_score: entry.taste_score,
    notes: entry.notes,
    updated_at: entry.updated_at,
  };
}

/** @deprecated Use upsertJournalForSession */
export async function upsertSessionMeta(input: {
  session_id: number;
  bean_id: number | null;
  grind_setting: number | null;
  grind_note: string | null;
  basket: string | null;
  brew_time_s: number | null;
  yield_g: number | null;
  taste_score: number | null;
  notes: string | null;
}): Promise<void> {
  await upsertJournalForSession(input.session_id, {
    title: null,
    bean_id: input.bean_id,
    grind_setting: input.grind_setting,
    grind_note: input.grind_note,
    basket: input.basket,
    dose_g: null,
    brew_time_s: input.brew_time_s,
    yield_g: input.yield_g,
    tds_pct: null,
    taste_score: input.taste_score,
    notes: input.notes,
  });
}

type AggAcc = DialAggRow & {
  scoreSum: number;
  brewSum: number;
  ratioSum: number;
  extractionSum: number;
  scoreN: number;
  brewN: number;
  ratioN: number;
  extractionN: number;
};

export async function getDialAggregates(): Promise<DialAggRow[]> {
  const rows = await listJournalEntries();
  const groups = new Map<string, AggAcc>();

  for (const r of rows) {
    const key = dialGroupKey(r.bean_id, r.grind_setting);
    if (!key) continue;

    let g = groups.get(key);
    if (!g) {
      g = {
        bean_id: r.bean_id,
        bean_name: r.bean_name ?? (r.bean_id != null ? `Bean ${r.bean_id}` : '—'),
        grind_setting: r.grind_setting,
        n: 0,
        avg_score: null,
        avg_brew_time_s: null,
        avg_ratio: null,
        avg_extraction_pct: null,
        hits: 0,
        sca_hits: 0,
        extraction_n: 0,
        scoreSum: 0,
        brewSum: 0,
        ratioSum: 0,
        extractionSum: 0,
        scoreN: 0,
        brewN: 0,
        ratioN: 0,
        extractionN: 0,
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

    const dose = effectiveDose(r, r.session_dose_g);
    const ratio = calcRatio(r.yield_g, dose);
    if (ratio != null) {
      g.ratioSum += ratio;
      g.ratioN += 1;
    }

    const extraction = calcExtractionYield(r.tds_pct, r.yield_g, dose);
    if (extraction != null) {
      g.extractionSum += extraction;
      g.extractionN += 1;
    }

    if (isDialInHit({ brew_time_s: r.brew_time_s, ratio, taste_score: r.taste_score })) {
      g.hits += 1;
    }
    if (isScaExtractionHit(extraction)) {
      g.sca_hits += 1;
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
    avg_extraction_pct: g.extractionN ? g.extractionSum / g.extractionN : null,
    hits: g.hits,
    sca_hits: g.sca_hits,
    extraction_n: g.extractionN,
  }));
}

export async function getBeanRecommendations(): Promise<BeanRecommendation[]> {
  const dials = await getDialAggregates();
  return dials
    .filter((d) => d.n >= 2)
    .map((d) => ({
      bean_id: d.bean_id,
      bean_name: dialGroupLabel(d.bean_name === '—' ? null : d.bean_name, d.grind_setting),
      grind_setting: d.grind_setting,
      n: d.n,
      avg_score: d.avg_score,
      avg_extraction_pct: d.avg_extraction_pct,
      hit_rate: d.n ? d.hits / d.n : 0,
      sca_hit_rate: d.extraction_n ? d.sca_hits / d.extraction_n : 0,
    }))
    .sort(
      (a, b) =>
        (b.avg_score ?? 0) - (a.avg_score ?? 0) ||
        b.hit_rate - a.hit_rate ||
        (b.avg_extraction_pct ?? 0) - (a.avg_extraction_pct ?? 0)
    );
}
