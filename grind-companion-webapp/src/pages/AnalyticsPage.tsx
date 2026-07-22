import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listJournalEntries, listSessions } from '../db/database';
import type { GrindSession } from '../parsing/types';
import {
  calcExtractionYield,
  calcRatio,
  effectiveDose,
} from '../journal/types';
import { formatJournalSummaryI18n } from '../i18n/journalSummary';
import { useEnumLabels } from '../i18n/useEnumLabels';
import type { JournalEntryWithBean } from '../journal/types';

export function AnalyticsPage() {
  const { t } = useTranslation();
  const { profile, mode } = useEnumLabels();
  const [sessions, setSessions] = useState<GrindSession[]>([]);
  const [metaById, setMetaById] = useState<Map<number, JournalEntryWithBean>>(new Map());

  useEffect(() => {
    void (async () => {
      const [sessionList, metas] = await Promise.all([listSessions(), listJournalEntries()]);
      setSessions(sessionList);
      const bySession = new Map<number, JournalEntryWithBean>();
      for (const m of metas) {
        if (m.session_id != null) bySession.set(m.session_id, m);
      }
      setMetaById(bySession);
    })();
  }, []);

  return (
    <div className="page">
      <h1>{t('analytics.title')}</h1>
      <p className="muted">
        {t('analytics.intro')}{' '}
        <Link to="/journal">{t('nav.journal')}</Link> ·{' '}
        <Link to="/beans">{t('analytics.beans')}</Link> ·{' '}
        <Link to="/diagnose">{t('analytics.diagnose')}</Link>
      </p>

      {sessions.length === 0 ? (
        <p className="muted">{t('analytics.empty')}</p>
      ) : (
        <ul className="session-list">
          {sessions.map((s) => {
            const meta = metaById.get(s.session_id);
            const dose = meta ? effectiveDose(meta, s.final_weight || s.target_weight) : null;
            const journalLine = meta
              ? formatJournalSummaryI18n(t, {
                  title: meta.title,
                  bean_name: meta.bean_name,
                  grind_setting: meta.grind_setting,
                  brew_time_s: meta.brew_time_s,
                  ratio: calcRatio(meta.yield_g, dose),
                  extraction_pct: calcExtractionYield(meta.tds_pct, meta.yield_g, dose),
                })
              : null;
            return (
              <li key={s.session_id}>
                <Link to={`/session/${s.session_id}`}>
                  <strong>#{s.session_id}</strong> {profile(s.profile_id)} · {mode(s.grind_mode)}
                  <span className="muted">
                    {' '}
                    · {s.final_weight.toFixed(1)} g / {s.target_weight.toFixed(1)} g ·{' '}
                    {(s.total_time_ms / 1000).toFixed(1)} s
                  </span>
                  {journalLine ? <div className="journal-line">{journalLine}</div> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
