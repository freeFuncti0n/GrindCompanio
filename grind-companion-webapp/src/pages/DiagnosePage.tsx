import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getBeanRecommendations,
  getDialAggregates,
  listBeans,
} from '../db/database';
import type { Bean, BeanRecommendation, DialAggRow } from '../journal/types';
import {
  TARGET_BREW_TIME_MAX_S,
  TARGET_BREW_TIME_MIN_S,
  TARGET_RATIO_MAX,
  TARGET_RATIO_MIN,
  TARGET_TASTE_MIN,
  formatRatio,
} from '../journal/types';

export function DiagnosePage() {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [beanFilter, setBeanFilter] = useState<number | null>(null);
  const [dials, setDials] = useState<DialAggRow[]>([]);
  const [recs, setRecs] = useState<BeanRecommendation[]>([]);

  useEffect(() => {
    void (async () => {
      const [beanList, allDials, allRecs] = await Promise.all([
        listBeans(),
        getDialAggregates(),
        getBeanRecommendations(),
      ]);
      setBeans(beanList);
      setDials(
        beanFilter == null ? allDials : allDials.filter((d) => d.bean_id === beanFilter)
      );
      setRecs(
        beanFilter == null ? allRecs : allRecs.filter((r) => r.bean_id === beanFilter)
      );
    })();
  }, [beanFilter]);

  return (
    <div className="page">
      <p>
        <Link to="/analytics">← Analytics</Link>
      </p>
      <h1>Diagnose</h1>
      <p className="muted">
        Ziel: Bezugszeit {TARGET_BREW_TIME_MIN_S}–{TARGET_BREW_TIME_MAX_S} s · Ratio{' '}
        {TARGET_RATIO_MIN}–{TARGET_RATIO_MAX} · Score ≥ {TARGET_TASTE_MIN}
      </p>

      <div className="chip-row">
        <button
          type="button"
          className={`chip ${beanFilter == null ? 'active' : ''}`}
          onClick={() => setBeanFilter(null)}
        >
          Alle
        </button>
        {beans.map((b) => {
          const active = beanFilter === b.id;
          return (
            <button
              key={b.id}
              type="button"
              className={`chip ${active ? 'active' : ''}`}
              onClick={() => setBeanFilter(active ? null : b.id)}
            >
              {b.name}
            </button>
          );
        })}
      </div>

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
        <p className="muted">Keine Aggregate — Journal mit Bezugszeit, Ausgabe und Score füllen.</p>
      ) : (
        <ul className="session-list">
          {dials.map((d) => (
            <li key={`${d.bean_id}-${d.grind_setting}`}>
              {d.bean_name} @ {d.grind_setting} · n={d.n} · {formatRatio(d.avg_ratio)} ·{' '}
              {d.avg_brew_time_s?.toFixed(0) ?? '—'} s · Hit {d.hits}/{d.n}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
