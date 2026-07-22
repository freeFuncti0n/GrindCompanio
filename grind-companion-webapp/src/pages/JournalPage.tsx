import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listJournalEntries } from '../db/database';
import type { JournalEntryWithBean } from '../journal/types';
import {
  calcExtractionYield,
  calcRatio,
  effectiveDose,
  formatJournalSummary,
} from '../journal/types';

export function JournalPage() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<JournalEntryWithBean[]>([]);

  useEffect(() => {
    void listJournalEntries().then(setEntries);
  }, []);

  return (
    <div className="page">
      <div className="page-header-row">
        <h1>{t('journalPage.title')}</h1>
        <Link className="btn primary" to="/journal/new">
          {t('journalPage.new')}
        </Link>
      </div>
      <p className="muted">{t('journalPage.intro')}</p>
      <p className="muted">
        <Link to="/beans">{t('analytics.beans')}</Link> ·{' '}
        <Link to="/diagnose">{t('analytics.diagnose')}</Link>
      </p>

      {entries.length === 0 ? (
        <p className="muted">{t('journalPage.empty')}</p>
      ) : (
        <ul className="session-list">
          {entries.map((entry) => {
            const dose = effectiveDose(entry, entry.session_dose_g);
            const ratio = calcRatio(entry.yield_g, dose);
            const extraction = calcExtractionYield(entry.tds_pct, entry.yield_g, dose);
            const summary = formatJournalSummary({
              title: entry.title,
              bean_name: entry.bean_name,
              grind_setting: entry.grind_setting,
              brew_time_s: entry.brew_time_s,
              ratio,
              extraction_pct: extraction,
            });
            const label =
              entry.title?.trim() ||
              (entry.session_id != null
                ? t('journalPage.sessionEntry', { id: entry.session_id })
                : t('journalPage.standaloneEntry'));
            return (
              <li key={entry.id}>
                <Link to={`/journal/${entry.id}`}>
                  <strong>{label}</strong>
                  {summary ? <div className="journal-line">{summary}</div> : null}
                  {!summary ? <div className="journal-line muted">{t('journalPage.partialEntry')}</div> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
