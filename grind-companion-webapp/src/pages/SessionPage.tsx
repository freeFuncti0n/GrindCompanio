import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getEvents, getMeasurements, getSession } from '../db/database';
import type { GrindEvent, GrindMeasurement, GrindSession } from '../parsing/types';
import { SessionChart } from '../components/SessionChart';
import { SessionJournalForm } from '../components/SessionJournalForm';
import { MODE_MAP, PROFILE_MAP, TERMINATION_REASON_MAP } from '../parsing/types';

export function SessionPage() {
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
          Session nicht gefunden. <Link to="/analytics">Zurück</Link>
        </p>
      </div>
    );
  }

  const doseG = session.final_weight || session.target_weight || 0;

  return (
    <div className="page">
      <p>
        <Link to="/analytics">← Analytics</Link>
      </p>
      <h1>Session #{session.session_id}</h1>
      <p className="muted">
        {PROFILE_MAP[session.profile_id] ?? session.profile_id} ·{' '}
        {MODE_MAP[session.grind_mode] ?? session.grind_mode} ·{' '}
        {TERMINATION_REASON_MAP[session.termination_reason] ?? session.termination_reason}
      </p>
      <p className="muted">
        {session.final_weight.toFixed(2)} g (Ziel {session.target_weight.toFixed(2)} g) · Error{' '}
        {session.error_grams.toFixed(2)} g · {events.length} Events · {measurements.length} Samples
      </p>

      <SessionChart points={chartPoints} height={200} />

      <SessionJournalForm sessionId={sessionId} doseG={doseG} />
    </div>
  );
}
