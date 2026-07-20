import { getDatabase } from '../db/database';
import type { Bean } from './types';

export async function listBeans(): Promise<Bean[]> {
  const db = await getDatabase();
  return db.getAllAsync<Bean>('SELECT * FROM beans ORDER BY name COLLATE NOCASE ASC');
}

export async function getBean(id: number): Promise<Bean | null> {
  const db = await getDatabase();
  return (
    (await db.getFirstAsync<Bean>('SELECT * FROM beans WHERE id = ?', id)) ?? null
  );
}

export async function createBean(input: {
  name: string;
  roaster?: string | null;
  origin?: string | null;
  roast_level?: number | null;
}): Promise<number> {
  const db = await getDatabase();
  const createdAt = Math.floor(Date.now() / 1000);
  const result = await db.runAsync(
    `INSERT INTO beans (name, roaster, origin, roast_level, created_at) VALUES (?, ?, ?, ?, ?)`,
    [
      input.name.trim(),
      input.roaster?.trim() || null,
      input.origin?.trim() || null,
      input.roast_level ?? null,
      createdAt,
    ]
  );
  return Number(result.lastInsertRowId);
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
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE beans SET name = ?, roaster = ?, origin = ?, roast_level = ? WHERE id = ?`,
    [
      input.name.trim(),
      input.roaster?.trim() || null,
      input.origin?.trim() || null,
      input.roast_level ?? null,
      id,
    ]
  );
}

export async function deleteBean(id: number): Promise<void> {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE session_meta SET bean_id = NULL WHERE bean_id = ?', id);
    await db.runAsync('DELETE FROM beans WHERE id = ?', id);
  });
}
