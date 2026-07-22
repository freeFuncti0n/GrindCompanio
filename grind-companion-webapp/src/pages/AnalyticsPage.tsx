import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listSessionMetaWithBeans, listSessions } from '../db/database';
import type { GrindSession } from '../parsing/types';
import { MODE_MAP, PROFILE_MAP } from '../parsing/types';
import {
  calcRatio,
  formatJournalSummary,
  type SessionMetaWithBean,
} from '../journal/types';

export function AnalyticsPage() {
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
      <h1>Analytics</h1>
      <p className="muted">
        Sessions aus IndexedDB (Sync über Connect / nach Grind).{' '}
        <Link to="/beans">Bohnen</Link> · <Link to="/diagnose">Diagnose</Link>
      </p>

      {sessions.length === 0 ? (
        <p className="muted">Noch keine Sessions. Verbinde den ESP und tippe Sync.</p>
      ) : (
        <ul className="session-list">
          {sessions.map((s) => {
            const meta = metaById.get(s.session_id);
            const journalLine = meta
              ? formatJournalSummary({
                  bean_name: meta.bean_name,
                  grind_setting: meta.grind_setting,
                  brew_time_s: meta.brew_time_s,
                  ratio: calcRatio(meta.yield_g, meta.dose_g ?? s.final_weight),
                })
              : null;
            return (
              <li key={s.session_id}>
                <Link to={`/session/${s.session_id}`}>
                  <strong>#{s.session_id}</strong>{' '}
                  {PROFILE_MAP[s.profile_id] ?? s.profile_id} ·{' '}
                  {MODE_MAP[s.grind_mode] ?? s.grind_mode}
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
