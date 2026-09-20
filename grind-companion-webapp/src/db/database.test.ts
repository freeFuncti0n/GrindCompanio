import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import {
  createBean,
  createJournalEntry,
  listBeans,
  listJournalEntries,
} from './database';

describe('concurrent record creation', () => {
  it('keeps every journal entry and bean when writes overlap', async () => {
    const count = 20;
    const journalEntries = await Promise.all(
      Array.from({ length: count }, (_, index) =>
        createJournalEntry({
          session_id: null,
          title: `Entry ${index}`,
          bean_id: null,
          grind_setting: null,
          grind_note: null,
          basket: null,
          dose_g: null,
          brew_time_s: null,
          yield_g: null,
          tds_pct: null,
          taste_score: null,
          notes: null,
        })
      )
    );
    const beans = await Promise.all(
      Array.from({ length: count }, (_, index) => createBean({ name: `Bean ${index}` }))
    );

    expect(new Set(journalEntries.map(({ id }) => id)).size).toBe(count);
    expect(new Set(beans.map(({ id }) => id)).size).toBe(count);
    expect((await listJournalEntries()).map(({ title }) => title)).toHaveLength(count);
    expect((await listBeans()).map(({ name }) => name)).toHaveLength(count);
  });
});
