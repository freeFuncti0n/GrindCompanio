export const TARGET_BREW_TIME_MIN_S = 25;
export const TARGET_BREW_TIME_MAX_S = 32;
export const TARGET_RATIO_MIN = 1.8;
export const TARGET_RATIO_MAX = 2.2;
export const TARGET_TASTE_MIN = 4;

export const SCA_EXTRACTION_MIN = 18;
export const SCA_EXTRACTION_MAX = 22;
export const SCA_TDS_MIN = 8;
export const SCA_TDS_MAX = 12;

export interface Bean {
  id: number;
  name: string;
  roaster: string | null;
  origin: string | null;
  roast_level: number | null;
  created_at: number;
}

export interface JournalEntry {
  id: number;
  session_id: number | null;
  title: string | null;
  bean_id: number | null;
  grind_setting: number | null;
  grind_note: string | null;
  basket: string | null;
  dose_g: number | null;
  brew_time_s: number | null;
  yield_g: number | null;
  tds_pct: number | null;
  taste_score: number | null;
  notes: string | null;
  created_at: number;
  updated_at: number;
}

export type JournalEntryInput = Omit<JournalEntry, 'id' | 'created_at' | 'updated_at'>;

export type JournalEntryUpdate = Partial<JournalEntryInput> & { id: number };

export interface JournalEntryWithBean extends JournalEntry {
  bean_name: string | null;
  bean_roaster: string | null;
  session_dose_g: number | null;
}

/** @deprecated Use JournalEntry — kept for gradual migration references */
export type SessionMeta = Pick<
  JournalEntry,
  | 'bean_id'
  | 'grind_setting'
  | 'grind_note'
  | 'basket'
  | 'brew_time_s'
  | 'yield_g'
  | 'taste_score'
  | 'notes'
> & { session_id: number; updated_at: number };

export type SessionMetaWithBean = SessionMeta & {
  bean_name: string | null;
  bean_roaster: string | null;
  dose_g: number | null;
};

export interface DialAggRow {
  bean_id: number | null;
  bean_name: string;
  grind_setting: number | null;
  n: number;
  avg_score: number | null;
  avg_brew_time_s: number | null;
  avg_ratio: number | null;
  avg_extraction_pct: number | null;
  hits: number;
  sca_hits: number;
  extraction_n: number;
}

export interface BeanRecommendation {
  bean_id: number | null;
  bean_name: string;
  grind_setting: number | null;
  n: number;
  avg_score: number | null;
  avg_extraction_pct: number | null;
  hit_rate: number;
  sca_hit_rate: number;
}

export type ExtractionZone = 'under' | 'ideal' | 'over';

export function effectiveDose(
  entry: { dose_g: number | null },
  sessionDose?: number | null
): number | null {
  if (entry.dose_g != null && entry.dose_g > 0) return entry.dose_g;
  if (sessionDose != null && sessionDose > 0) return sessionDose;
  return null;
}

export function calcRatio(yieldG: number | null | undefined, doseG: number | null | undefined): number | null {
  if (yieldG == null || doseG == null || doseG <= 0) return null;
  return yieldG / doseG;
}

export function calcExtractionYield(
  tdsPct: number | null | undefined,
  yieldG: number | null | undefined,
  doseG: number | null | undefined
): number | null {
  if (tdsPct == null || yieldG == null || doseG == null || doseG <= 0) return null;
  return (tdsPct * yieldG) / doseG;
}

export function extractionZone(extractionPct: number | null | undefined): ExtractionZone | null {
  if (extractionPct == null || !Number.isFinite(extractionPct)) return null;
  if (extractionPct < SCA_EXTRACTION_MIN) return 'under';
  if (extractionPct > SCA_EXTRACTION_MAX) return 'over';
  return 'ideal';
}

export function isDialInHit(opts: {
  brew_time_s: number | null;
  ratio: number | null;
  taste_score: number | null;
}): boolean {
  const { brew_time_s, ratio, taste_score } = opts;
  if (taste_score == null || taste_score < TARGET_TASTE_MIN) return false;
  if (brew_time_s == null || ratio == null) return false;
  return (
    brew_time_s >= TARGET_BREW_TIME_MIN_S &&
    brew_time_s <= TARGET_BREW_TIME_MAX_S &&
    ratio >= TARGET_RATIO_MIN &&
    ratio <= TARGET_RATIO_MAX
  );
}

export function isScaExtractionHit(extractionPct: number | null | undefined): boolean {
  const zone = extractionZone(extractionPct);
  return zone === 'ideal';
}

/** @deprecated Use isDialInHit */
export const isTargetHit = isDialInHit;

export function formatRatio(ratio: number | null): string {
  if (ratio == null || !Number.isFinite(ratio)) return '—';
  return `1:${ratio.toFixed(2)}`;
}

export function formatExtraction(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct)) return '—';
  return `${pct.toFixed(1)}%`;
}

export function formatJournalSummary(meta: {
  title?: string | null;
  bean_name?: string | null;
  grind_setting?: number | null;
  brew_time_s?: number | null;
  ratio?: number | null;
  extraction_pct?: number | null;
}): string {
  const parts: string[] = [];
  if (meta.title?.trim()) parts.push(meta.title.trim());
  if (meta.bean_name) parts.push(meta.bean_name);
  if (meta.grind_setting != null) parts.push(`Dial ${meta.grind_setting}`);
  if (meta.brew_time_s != null) parts.push(`${meta.brew_time_s}s`);
  if (meta.ratio != null) parts.push(formatRatio(meta.ratio));
  if (meta.extraction_pct != null) parts.push(formatExtraction(meta.extraction_pct));
  return parts.join(' · ');
}

export function dialGroupKey(beanId: number | null, grindSetting: number | null): string | null {
  if (beanId == null && grindSetting == null) return null;
  return `${beanId ?? 'any'}:${grindSetting ?? 'any'}`;
}

export function dialGroupLabel(beanName: string | null, grindSetting: number | null): string {
  const bean = beanName ?? '—';
  const dial = grindSetting != null ? `@ ${grindSetting}` : '';
  return `${bean} ${dial}`.trim();
}
