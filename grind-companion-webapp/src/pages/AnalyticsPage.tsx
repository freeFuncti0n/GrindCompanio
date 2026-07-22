import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listSessions } from '../db/database';
import type { GrindSession } from '../parsing/types';
import { MODE_MAP, PROFILE_MAP } from '../parsing/types';

export function AnalyticsPage() {
  const [sessions, setSessions] = useState<GrindSession[]>([]);

  useEffect(() => {
    void listSessions().then(setSessions);
  }, []);

  return (
    <div className="page">
      <h1>Analytics</h1>
      <p className="muted">
        Sessions aus IndexedDB (Sync über Connect).{' '}
        <Link to="/beans">Bohnen</Link> · <Link to="/diagnose">Diagnose</Link>
      </p>

      {sessions.length === 0 ? (
        <p className="muted">Noch keine Sessions. Verbinde den ESP und tippe Sync.</p>
      ) : (
        <ul className="session-list">
          {sessions.map((s) => (
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
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
