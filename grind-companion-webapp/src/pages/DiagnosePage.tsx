import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getBeanRecommendations, getDialAggregates } from '../db/database';
import type { BeanRecommendation, DialAggRow } from '../journal/types';
import { formatRatio } from '../journal/types';

export function DiagnosePage() {
  const [dials, setDials] = useState<DialAggRow[]>([]);
  const [recs, setRecs] = useState<BeanRecommendation[]>([]);

  useEffect(() => {
    void (async () => {
      setDials(await getDialAggregates());
      setRecs(await getBeanRecommendations());
    })();
  }, []);

  return (
    <div className="page">
      <p>
        <Link to="/analytics">← Analytics</Link>
      </p>
      <h1>Diagnose</h1>

      <h2>Empfehlungen</h2>
      {recs.length === 0 ? (
        <p className="muted">Noch zu wenig Journal-Daten (mind. 2 Shots pro Einstellung).</p>
      ) : (
        <ul className="session-list">
          {recs.map((r) => (
            <li key={`${r.bean_id}-${r.grind_setting}`}>
              {r.bean_name} @ {r.grind_setting} · Score {r.avg_score?.toFixed(1) ?? '—'} · Hit{' '}
              {Math.round(r.hit_rate * 100)}%
            </li>
          ))}
        </ul>
      )}

      <h2>Dial-Übersicht</h2>
      {dials.length === 0 ? (
        <p className="muted">Keine Aggregate.</p>
      ) : (
        <ul className="session-list">
          {dials.map((d) => (
            <li key={`${d.bean_id}-${d.grind_setting}`}>
              {d.bean_name} @ {d.grind_setting} · n={d.n} · {formatRatio(d.avg_ratio)} ·{' '}
              {d.avg_brew_time_s?.toFixed(0) ?? '—'} s
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
