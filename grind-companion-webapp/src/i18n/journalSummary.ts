import { calcRatio, formatRatio } from '../journal/types';
import type { TFunction } from 'i18next';

export function formatJournalSummaryI18n(
  t: TFunction,
  meta: {
    bean_name?: string | null;
    grind_setting?: number | null;
    brew_time_s?: number | null;
    ratio?: number | null;
  }
): string {
  const parts: string[] = [];
  if (meta.bean_name) parts.push(meta.bean_name);
  if (meta.grind_setting != null) {
    parts.push(t('journal.dial', { value: meta.grind_setting }));
  }
  if (meta.brew_time_s != null) {
    parts.push(t('journal.brewSeconds', { value: meta.brew_time_s }));
  }
  if (meta.ratio != null) parts.push(formatRatio(meta.ratio));
  return parts.join(' · ');
}

export function journalRatio(
  yieldG: number | null | undefined,
  doseG: number | null | undefined
): number | null {
  return calcRatio(yieldG, doseG);
}
