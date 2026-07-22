import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listSessionMetaWithBeans, listSessions } from '../db/database';
import type { GrindSession } from '../parsing/types';
import { calcRatio } from '../journal/types';
import { formatJournalSummaryI18n } from '../i18n/journalSummary';
import { useEnumLabels } from '../i18n/useEnumLabels';
import type { SessionMetaWithBean } from '../journal/types';

export function AnalyticsPage() {
  const { t } = useTranslation();
  const { profile, mode } = useEnumLabels();
  const [sessions, setSessions] = useState<GrindSession[]>([]);
  const [metaById, setMetaById] = useState<Map<number, SessionMetaWithBean>>(new Map());

  useEffect(() => {
    void (async () => {
      const [sessionList, metas] = await Promise.all([
        listSessions(),
        listSessionMetaWithBeans(),
      ]);
      setSessions(sessionList);
      setMetaById(new Map(metas.map((m) => [m.session_id, m])));
    })();
  }, []);

  return (
    <div className="page">
      <h1>{t('analytics.title')}</h1>
      <p className="muted">
        {t('analytics.intro')}{' '}
        <Link to="/beans">{t('analytics.beans')}</Link> ·{' '}
        <Link to="/diagnose">{t('analytics.diagnose')}</Link>
      </p>

      {sessions.length === 0 ? (
        <p className="muted">{t('analytics.empty')}</p>
      ) : (
        <ul className="session-list">
          {sessions.map((s) => {
            const meta = metaById.get(s.session_id);
            const journalLine = meta
              ? formatJournalSummaryI18n(t, {
                  bean_name: meta.bean_name,
                  grind_setting: meta.grind_setting,
                  brew_time_s: meta.brew_time_s,
                  ratio: calcRatio(meta.yield_g, meta.dose_g ?? s.final_weight),
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
