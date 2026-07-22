import { useTranslation } from 'react-i18next';
import { MODE_MAP, PHASE_NAMES, PROFILE_MAP, TERMINATION_REASON_MAP } from '../parsing/types';

function enumLabel(
  t: ReturnType<typeof useTranslation>['t'],
  group: 'profile' | 'mode' | 'termination' | 'phase',
  id: number,
  fallbackMap: Record<number, string>
): string {
  const key = `enum.${group}.${id}`;
  const translated = t(key, { defaultValue: '' });
  if (translated) return translated;
  return fallbackMap[id] ?? String(id);
}

export function useEnumLabels() {
  const { t } = useTranslation();

  return {
    profile: (id: number) => enumLabel(t, 'profile', id, PROFILE_MAP),
    mode: (id: number) => enumLabel(t, 'mode', id, MODE_MAP),
    termination: (id: number) => enumLabel(t, 'termination', id, TERMINATION_REASON_MAP),
    phase: (id: number) => enumLabel(t, 'phase', id, PHASE_NAMES),
  };
}
