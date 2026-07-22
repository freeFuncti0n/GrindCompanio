export const TARGET_BREW_TIME_MIN_S = 25;
export const TARGET_BREW_TIME_MAX_S = 32;
export const TARGET_RATIO_MIN = 1.8;
export const TARGET_RATIO_MAX = 2.2;
export const TARGET_TASTE_MIN = 4;

export interface Bean {
  id: number;
  name: string;
  roaster: string | null;
  origin: string | null;
  roast_level: number | null;
  created_at: number;
}

export interface SessionMeta {
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
}

export type SessionMetaInput = Omit<SessionMeta, 'updated_at'>;

export interface SessionMetaWithBean extends SessionMeta {
  bean_name: string | null;
  bean_roaster: string | null;
  dose_g: number | null;
}

export interface DialAggRow {
  bean_id: number;
  bean_name: string;
  grind_setting: number;
  n: number;
  avg_score: number | null;
  avg_brew_time_s: number | null;
  avg_ratio: number | null;
  hits: number;
}

export interface BeanRecommendation {
  bean_id: number;
  bean_name: string;
  grind_setting: number;
  n: number;
  avg_score: number | null;
  hit_rate: number;
}

export function calcRatio(yieldG: number | null | undefined, doseG: number | null | undefined): number | null {
  if (yieldG == null || doseG == null || doseG <= 0) return null;
  return yieldG / doseG;
}

export function formatRatio(ratio: number | null): string {
  if (ratio == null || !Number.isFinite(ratio)) return '—';
  return `1:${ratio.toFixed(2)}`;
}

export function isTargetHit(opts: {
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

export function formatJournalSummary(meta: {
  bean_name?: string | null;
  grind_setting?: number | null;
  brew_time_s?: number | null;
  ratio?: number | null;
}): string {
  const parts: string[] = [];
  if (meta.bean_name) parts.push(meta.bean_name);
  if (meta.grind_setting != null) parts.push(`Dial ${meta.grind_setting}`);
  if (meta.brew_time_s != null) parts.push(`${meta.brew_time_s}s`);
  if (meta.ratio != null) parts.push(formatRatio(meta.ratio));
  return parts.join(' · ');
}
