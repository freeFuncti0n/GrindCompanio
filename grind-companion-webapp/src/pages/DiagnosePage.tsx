import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getBeanRecommendations, getDialAggregates, listBeans } from '../db/database';
import type { Bean, BeanRecommendation, DialAggRow } from '../journal/types';
import {
  SCA_EXTRACTION_MAX,
  SCA_EXTRACTION_MIN,
  TARGET_BREW_TIME_MAX_S,
  TARGET_BREW_TIME_MIN_S,
  TARGET_RATIO_MAX,
  TARGET_RATIO_MIN,
  TARGET_TASTE_MIN,
  dialGroupLabel,
  formatExtraction,
  formatRatio,
} from '../journal/types';

export function DiagnosePage() {
  const { t } = useTranslation();
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
      setDials(beanFilter == null ? allDials : allDials.filter((d) => d.bean_id === beanFilter));
      setRecs(beanFilter == null ? allRecs : allRecs.filter((r) => r.bean_id === beanFilter));
    })();
  }, [beanFilter]);

  return (
    <div className="page">
      <p>
        <Link to="/journal">{t('journalPage.back')}</Link>
      </p>
      <h1>{t('diagnose.title')}</h1>
      <p className="muted">{t('diagnose.intro')}</p>
      <p className="muted">
        {t('diagnose.goal', {
          brewMin: TARGET_BREW_TIME_MIN_S,
          brewMax: TARGET_BREW_TIME_MAX_S,
          ratioMin: TARGET_RATIO_MIN,
          ratioMax: TARGET_RATIO_MAX,
          scoreMin: TARGET_TASTE_MIN,
          eyMin: SCA_EXTRACTION_MIN,
          eyMax: SCA_EXTRACTION_MAX,
        })}
      </p>

      <div className="chip-row">
        <button
          type="button"
          className={`chip ${beanFilter == null ? 'active' : ''}`}
          onClick={() => setBeanFilter(null)}
        >
          {t('common.all')}
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

      <h2>{t('diagnose.recommendations')}</h2>
      {recs.length === 0 ? (
        <p className="muted">{t('diagnose.notEnoughData')}</p>
      ) : (
        <ul className="session-list">
          {recs.map((r) => (
            <li key={`${r.bean_id}-${r.grind_setting}`}>
              {t('diagnose.recommendationLine', {
                bean: r.bean_name,
                dial: r.grind_setting ?? t('common.dash'),
                score: r.avg_score?.toFixed(1) ?? t('common.dash'),
                hit: Math.round(r.hit_rate * 100),
                extraction: r.avg_extraction_pct != null ? formatExtraction(r.avg_extraction_pct) : t('common.dash'),
                scaHit: r.sca_hit_rate > 0 ? Math.round(r.sca_hit_rate * 100) : t('common.dash'),
              })}
            </li>
          ))}
        </ul>
      )}

      <h2>{t('diagnose.dialOverview')}</h2>
      {dials.length === 0 ? (
        <p className="muted">{t('diagnose.noAggregates')}</p>
      ) : (
        <ul className="session-list">
          {dials.map((d) => (
            <li key={`${d.bean_id}-${d.grind_setting}`}>
              {t('diagnose.dialLine', {
                bean: dialGroupLabel(d.bean_name === '—' ? null : d.bean_name, d.grind_setting),
                n: d.n,
                ratio: formatRatio(d.avg_ratio),
                brew: d.avg_brew_time_s?.toFixed(0) ?? t('common.dash'),
                hits: d.hits,
                extraction: d.avg_extraction_pct != null ? formatExtraction(d.avg_extraction_pct) : t('common.dash'),
                scaHits: d.extraction_n > 0 ? `${d.sca_hits}/${d.extraction_n}` : t('common.dash'),
              })}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
