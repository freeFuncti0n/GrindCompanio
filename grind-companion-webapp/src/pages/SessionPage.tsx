import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getEvents, getMeasurements, getSession, getSessionMeta, upsertSessionMeta } from '../db/database';
import { listBeans } from '../db/database';
import type { GrindEvent, GrindMeasurement, GrindSession } from '../parsing/types';
import type { Bean, SessionMeta } from '../journal/types';
import { SessionChart } from '../components/SessionChart';

export function SessionPage() {
  const { id } = useParams();
  const sessionId = Number(id);
  const [session, setSession] = useState<GrindSession | null>(null);
  const [events, setEvents] = useState<GrindEvent[]>([]);
  const [measurements, setMeasurements] = useState<GrindMeasurement[]>([]);
  const [meta, setMeta] = useState<Partial<SessionMeta>>({});
  const [beans, setBeans] = useState<Bean[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(sessionId)) return;
    void (async () => {
      setSession((await getSession(sessionId)) ?? null);
      setEvents(await getEvents(sessionId));
      setMeasurements(await getMeasurements(sessionId));
      setMeta((await getSessionMeta(sessionId)) ?? { session_id: sessionId });
      setBeans(await listBeans());
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
        <p className="muted">Session nicht gefunden. <Link to="/analytics">Zurück</Link></p>
      </div>
    );
  }

  return (
    <div className="page">
      <p>
        <Link to="/analytics">← Analytics</Link>
      </p>
      <h1>Session #{session.session_id}</h1>
      <p className="muted">
        {session.final_weight.toFixed(2)} g (Ziel {session.target_weight.toFixed(2)} g) · Error{' '}
        {session.error_grams.toFixed(2)} g · {events.length} Events · {measurements.length} Samples
      </p>

      <SessionChart points={chartPoints} height={200} />

      <div className="card">
        <h2>Journal</h2>
        <label className="label">Bohne</label>
        <select
          className="input"
          value={meta.bean_id ?? ''}
          onChange={(e) =>
            setMeta((m) => ({
              ...m,
              bean_id: e.target.value ? Number(e.target.value) : null,
            }))
          }
        >
          <option value="">—</option>
          {beans.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
        <label className="label">Mahlgrad</label>
        <input
          className="input"
          type="number"
          step="0.1"
          value={meta.grind_setting ?? ''}
          onChange={(e) =>
            setMeta((m) => ({
              ...m,
              grind_setting: e.target.value ? Number(e.target.value) : null,
            }))
          }
        />
        <label className="label">Geschmack (1–5)</label>
        <input
          className="input"
          type="number"
          min={1}
          max={5}
          value={meta.taste_score ?? ''}
          onChange={(e) =>
            setMeta((m) => ({
              ...m,
              taste_score: e.target.value ? Number(e.target.value) : null,
            }))
          }
        />
        <label className="label">Notizen</label>
        <textarea
          className="input"
          rows={3}
          value={meta.notes ?? ''}
          onChange={(e) => setMeta((m) => ({ ...m, notes: e.target.value || null }))}
        />
        <button
          className="btn primary"
          type="button"
          onClick={async () => {
            await upsertSessionMeta({
              session_id: sessionId,
              bean_id: meta.bean_id ?? null,
              grind_setting: meta.grind_setting ?? null,
              grind_note: meta.grind_note ?? null,
              basket: meta.basket ?? null,
              brew_time_s: meta.brew_time_s ?? null,
              yield_g: meta.yield_g ?? null,
              taste_score: meta.taste_score ?? null,
              notes: meta.notes ?? null,
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 1500);
          }}
        >
          Speichern
        </button>
        {saved ? <span className="success"> Gespeichert</span> : null}
      </div>
    </div>
  );
}
