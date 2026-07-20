import { getDatabase } from '../db/database';
import type { SessionMeta, SessionMetaInput, SessionMetaWithBean } from './types';

export async function getSessionMeta(sessionId: number): Promise<SessionMeta | null> {
  const db = await getDatabase();
  return (
    (await db.getFirstAsync<SessionMeta>(
      'SELECT * FROM session_meta WHERE session_id = ?',
      sessionId
    )) ?? null
  );
}

export async function getSessionMetaWithBean(
  sessionId: number
): Promise<SessionMetaWithBean | null> {
  const db = await getDatabase();
  return (
    (await db.getFirstAsync<SessionMetaWithBean>(
      `SELECT
        m.*,
        b.name AS bean_name,
        b.roaster AS bean_roaster,
        s.final_weight AS dose_g
      FROM session_meta m
      LEFT JOIN beans b ON b.id = m.bean_id
      LEFT JOIN grind_sessions s ON s.session_id = m.session_id
      WHERE m.session_id = ?`,
      sessionId
    )) ?? null
  );
}

export async function listSessionMetaBySessionIds(
  sessionIds: number[]
): Promise<Map<number, SessionMetaWithBean>> {
  const map = new Map<number, SessionMetaWithBean>();
  if (sessionIds.length === 0) return map;
  const db = await getDatabase();
  const placeholders = sessionIds.map(() => '?').join(',');
  const rows = await db.getAllAsync<SessionMetaWithBean>(
    `SELECT
      m.*,
      b.name AS bean_name,
      b.roaster AS bean_roaster,
      s.final_weight AS dose_g
    FROM session_meta m
    LEFT JOIN beans b ON b.id = m.bean_id
    LEFT JOIN grind_sessions s ON s.session_id = m.session_id
    WHERE m.session_id IN (${placeholders})`,
    sessionIds
  );
  for (const row of rows) {
    map.set(row.session_id, row);
  }
  return map;
}

export async function upsertSessionMeta(input: SessionMetaInput): Promise<void> {
  const db = await getDatabase();
  const updatedAt = Math.floor(Date.now() / 1000);
  await db.runAsync(
    `INSERT INTO session_meta (
      session_id, bean_id, grind_setting, grind_note, basket,
      brew_time_s, yield_g, taste_score, notes, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET
      bean_id = excluded.bean_id,
      grind_setting = excluded.grind_setting,
      grind_note = excluded.grind_note,
      basket = excluded.basket,
      brew_time_s = excluded.brew_time_s,
      yield_g = excluded.yield_g,
      taste_score = excluded.taste_score,
      notes = excluded.notes,
      updated_at = excluded.updated_at`,
    [
      input.session_id,
      input.bean_id,
      input.grind_setting,
      input.grind_note,
      input.basket,
      input.brew_time_s,
      input.yield_g,
      input.taste_score,
      input.notes,
      updatedAt,
    ]
  );
}

export async function getLastJournalDefaults(): Promise<{
  bean_id: number | null;
  grind_setting: number | null;
} | null> {
  const db = await getDatabase();
  return (
    (await db.getFirstAsync<{ bean_id: number | null; grind_setting: number | null }>(
      `SELECT bean_id, grind_setting FROM session_meta
       WHERE bean_id IS NOT NULL OR grind_setting IS NOT NULL
       ORDER BY updated_at DESC LIMIT 1`
    )) ?? null
  );
}
