import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getEvents, getMeasurements, getSession } from '../db/database';
import type { GrindEvent, GrindMeasurement, GrindSession } from '../parsing/types';
import { SessionChart } from '../components/SessionChart';
import { SessionJournalForm } from '../components/SessionJournalForm';
import { useEnumLabels } from '../i18n/useEnumLabels';

export function SessionPage() {
  const { t } = useTranslation();
  const { profile, mode, termination } = useEnumLabels();
  const { id } = useParams();
  const sessionId = Number(id);
  const [session, setSession] = useState<GrindSession | null>(null);
  const [events, setEvents] = useState<GrindEvent[]>([]);
  const [measurements, setMeasurements] = useState<GrindMeasurement[]>([]);

  useEffect(() => {
    if (!Number.isFinite(sessionId)) return;
    void (async () => {
      setSession((await getSession(sessionId)) ?? null);
      setEvents(await getEvents(sessionId));
      setMeasurements(await getMeasurements(sessionId));
    })();
  }, [sessionId]);

  const chartPoints = measurements.map((m) => ({
    t: m.timestamp_ms,
    weight: m.weight_grams,
    flow: m.flow_rate_g_per_s,
  }));

  if (!session) {
    return (
      <div className="page">
        <p className="muted">
          {t('session.notFound')} <Link to="/analytics">{t('common.back')}</Link>
        </p>
      </div>
    );
  }

  const doseG = session.final_weight || session.target_weight || 0;

  return (
    <div className="page">
      <p>
        <Link to="/analytics">{t('common.backToAnalytics')}</Link>
      </p>
      <h1>{t('session.title', { id: session.session_id })}</h1>
      <p className="muted">
        {profile(session.profile_id)} · {mode(session.grind_mode)} ·{' '}
        {termination(session.termination_reason)}
      </p>
      <p className="muted">
        {t('session.stats', {
          final: session.final_weight.toFixed(2),
          target: session.target_weight.toFixed(2),
          error: session.error_grams.toFixed(2),
          events: events.length,
          samples: measurements.length,
        })}
      </p>

      <SessionChart points={chartPoints} height={200} />

      <SessionJournalForm sessionId={sessionId} doseG={doseG} />
    </div>
  );
}
