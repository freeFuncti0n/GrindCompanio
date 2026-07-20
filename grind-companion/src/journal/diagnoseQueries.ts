import { getDatabase } from '../db/database';
import {
  TARGET_BREW_TIME_MAX_S,
  TARGET_BREW_TIME_MIN_S,
  TARGET_RATIO_MAX,
  TARGET_RATIO_MIN,
  TARGET_TASTE_MIN,
  type BeanRecommendation,
  type DialAggRow,
} from './types';

type RawAgg = {
  bean_id: number;
  bean_name: string;
  grind_setting: number;
  n: number;
  avg_score: number | null;
  avg_brew_time_s: number | null;
  avg_yield_g: number | null;
  avg_dose_g: number | null;
  hits: number;
};

function toDialRow(row: RawAgg): DialAggRow {
  const avgRatio =
    row.avg_yield_g != null && row.avg_dose_g != null && row.avg_dose_g > 0
      ? row.avg_yield_g / row.avg_dose_g
      : null;
  return {
    bean_id: row.bean_id,
    bean_name: row.bean_name,
    grind_setting: row.grind_setting,
    n: row.n,
    avg_score: row.avg_score,
    avg_brew_time_s: row.avg_brew_time_s,
    avg_ratio: avgRatio,
    hits: row.hits,
  };
}

export async function getDialAggregates(beanId?: number | null): Promise<DialAggRow[]> {
  const db = await getDatabase();
  const params: number[] = [];
  let beanFilter = '';
  if (beanId != null) {
    beanFilter = 'AND m.bean_id = ?';
    params.push(beanId);
  }

  const rows = await db.getAllAsync<RawAgg>(
    `SELECT
      m.bean_id AS bean_id,
      b.name AS bean_name,
      m.grind_setting AS grind_setting,
      COUNT(*) AS n,
      AVG(m.taste_score) AS avg_score,
      AVG(m.brew_time_s) AS avg_brew_time_s,
      AVG(m.yield_g) AS avg_yield_g,
      AVG(s.final_weight) AS avg_dose_g,
      SUM(
        CASE
          WHEN m.taste_score IS NOT NULL
            AND m.taste_score >= ${TARGET_TASTE_MIN}
            AND m.brew_time_s IS NOT NULL
            AND m.yield_g IS NOT NULL
            AND s.final_weight IS NOT NULL
            AND s.final_weight > 0
            AND m.brew_time_s >= ${TARGET_BREW_TIME_MIN_S}
            AND m.brew_time_s <= ${TARGET_BREW_TIME_MAX_S}
            AND (m.yield_g / s.final_weight) >= ${TARGET_RATIO_MIN}
            AND (m.yield_g / s.final_weight) <= ${TARGET_RATIO_MAX}
          THEN 1 ELSE 0
        END
      ) AS hits
    FROM session_meta m
    INNER JOIN beans b ON b.id = m.bean_id
    LEFT JOIN grind_sessions s ON s.session_id = m.session_id
    WHERE m.bean_id IS NOT NULL
      AND m.grind_setting IS NOT NULL
      ${beanFilter}
    GROUP BY m.bean_id, b.name, m.grind_setting
    ORDER BY b.name COLLATE NOCASE ASC, m.grind_setting ASC`,
    params
  );

  return rows.map(toDialRow);
}

export async function getBeanRecommendations(): Promise<BeanRecommendation[]> {
  const rows = await getDialAggregates(null);
  const byBean = new Map<number, DialAggRow[]>();
  for (const row of rows) {
    const list = byBean.get(row.bean_id) ?? [];
    list.push(row);
    byBean.set(row.bean_id, list);
  }

  const recommendations: BeanRecommendation[] = [];
  for (const [, dials] of byBean) {
    const eligible = dials.filter((d) => d.n >= 3);
    const pool = eligible.length > 0 ? eligible : dials;
    pool.sort((a, b) => {
      const scoreA = a.avg_score ?? -1;
      const scoreB = b.avg_score ?? -1;
      if (scoreB !== scoreA) return scoreB - scoreA;
      const hitA = a.n > 0 ? a.hits / a.n : 0;
      const hitB = b.n > 0 ? b.hits / b.n : 0;
      if (hitB !== hitA) return hitB - hitA;
      return b.n - a.n;
    });
    const best = pool[0];
    if (!best) continue;
    recommendations.push({
      bean_id: best.bean_id,
      bean_name: best.bean_name,
      grind_setting: best.grind_setting,
      n: best.n,
      avg_score: best.avg_score,
      hit_rate: best.n > 0 ? best.hits / best.n : 0,
    });
  }

  return recommendations.sort((a, b) => a.bean_name.localeCompare(b.bean_name));
}
