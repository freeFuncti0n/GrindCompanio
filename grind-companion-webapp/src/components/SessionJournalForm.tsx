import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  createBean,
  getLastJournalDefaults,
  getSessionMeta,
  listBeans,
  upsertSessionMeta,
} from '../db/database';
import {
  TARGET_BREW_TIME_MAX_S,
  TARGET_BREW_TIME_MIN_S,
  TARGET_RATIO_MAX,
  TARGET_RATIO_MIN,
  TARGET_TASTE_MIN,
  calcRatio,
  formatRatio,
  isTargetHit,
  type Bean,
} from '../journal/types';

type Props = {
  sessionId: number;
  /** Dose from synced WiFi session (final_weight / target), not BLE live. */
  doseG: number;
};

function parseOptionalNumber(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function SessionJournalForm({ sessionId, doseG }: Props) {
  const [beans, setBeans] = useState<Bean[]>([]);
  const [beanId, setBeanId] = useState<number | null>(null);
  const [grindSetting, setGrindSetting] = useState('');
  const [grindNote, setGrindNote] = useState('');
  const [basket, setBasket] = useState('');
  const [brewTime, setBrewTime] = useState('');
  const [yieldG, setYieldG] = useState('');
  const [tasteScore, setTasteScore] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newBeanName, setNewBeanName] = useState('');
  const [showNewBean, setShowNewBean] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [beanList, existing, defaults] = await Promise.all([
        listBeans(),
        getSessionMeta(sessionId),
        getLastJournalDefaults(),
      ]);
      if (cancelled) return;
      setBeans(beanList);

      if (existing) {
        setBeanId(existing.bean_id);
        setGrindSetting(existing.grind_setting != null ? String(existing.grind_setting) : '');
        setGrindNote(existing.grind_note ?? '');
        setBasket(existing.basket ?? '');
        setBrewTime(existing.brew_time_s != null ? String(existing.brew_time_s) : '');
        setYieldG(existing.yield_g != null ? String(existing.yield_g) : '');
        setTasteScore(existing.taste_score);
        setNotes(existing.notes ?? '');
      } else if (defaults) {
        setBeanId(defaults.bean_id);
        if (defaults.grind_setting != null) {
          setGrindSetting(String(defaults.grind_setting));
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const brewTimeN = parseOptionalNumber(brewTime);
  const yieldN = parseOptionalNumber(yieldG);
  const ratio = useMemo(() => calcRatio(yieldN, doseG), [yieldN, doseG]);
  const targetHit = isTargetHit({
    brew_time_s: brewTimeN,
    ratio,
    taste_score: tasteScore,
  });

  async function onSave() {
    setSaving(true);
    setStatus(null);
    try {
      await upsertSessionMeta({
        session_id: sessionId,
        bean_id: beanId,
        grind_setting: parseOptionalNumber(grindSetting),
        grind_note: grindNote.trim() || null,
        basket: basket.trim() || null,
        brew_time_s: brewTimeN,
        yield_g: yieldN,
        taste_score: tasteScore,
        notes: notes.trim() || null,
      });
      setStatus('Gespeichert');
      setBeans(await listBeans());
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Speichern fehlgeschlagen');
    } finally {
      setSaving(false);
    }
  }

  async function onCreateBean() {
    if (!newBeanName.trim()) return;
    const bean = await createBean({ name: newBeanName });
    setBeans(await listBeans());
    setBeanId(bean.id);
    setNewBeanName('');
    setShowNewBean(false);
  }

  return (
    <div className="card journal-form">
      <h2>Journal</h2>
      <p className="muted journal-hint">
        Dosis aus WiFi-Session: {doseG.toFixed(2)} g · Ziel Bezugszeit {TARGET_BREW_TIME_MIN_S}–
        {TARGET_BREW_TIME_MAX_S} s · Ratio {TARGET_RATIO_MIN}–{TARGET_RATIO_MAX} · Score ≥{' '}
        {TARGET_TASTE_MIN}
      </p>

      <label className="label">Bohne</label>
      <div className="chip-row">
        {beans.map((b) => {
          const active = beanId === b.id;
          return (
            <button
              key={b.id}
              type="button"
              className={`chip ${active ? 'active' : ''}`}
              onClick={() => setBeanId(active ? null : b.id)}
            >
              {b.name}
            </button>
          );
        })}
        <button type="button" className="chip accent" onClick={() => setShowNewBean((v) => !v)}>
          + Neu
        </button>
        <Link className="chip" to="/beans">
          Alle
        </Link>
      </div>

      {showNewBean ? (
        <div className="field-row">
          <input
            className="input"
            placeholder="Bohnenname"
            value={newBeanName}
            onChange={(e) => setNewBeanName(e.target.value)}
          />
          <button className="btn primary" type="button" onClick={() => void onCreateBean()}>
            Anlegen
          </button>
        </div>
      ) : null}

      <div className="field-grid">
        <div>
          <label className="label">Mahlgrad (Dial)</label>
          <input
            className="input"
            inputMode="decimal"
            placeholder="3.5"
            value={grindSetting}
            onChange={(e) => setGrindSetting(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Bezugszeit (s)</label>
          <input
            className="input"
            inputMode="decimal"
            placeholder="28"
            value={brewTime}
            onChange={(e) => setBrewTime(e.target.value)}
          />
        </div>
      </div>

      <div className="field-grid">
        <div>
          <label className="label">Ausgabe (g)</label>
          <input
            className="input"
            inputMode="decimal"
            placeholder="36"
            value={yieldG}
            onChange={(e) => setYieldG(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Dosis / Ratio</label>
          <p className="computed">
            {doseG.toFixed(2)} g · {formatRatio(ratio)}
          </p>
        </div>
      </div>

      <label className="label">Korb</label>
      <input
        className="input"
        placeholder="18g VST"
        value={basket}
        onChange={(e) => setBasket(e.target.value)}
      />

      <label className="label">Geschmack</label>
      <div className="score-row">
        {[1, 2, 3, 4, 5].map((n) => {
          const active = tasteScore === n;
          return (
            <button
              key={n}
              type="button"
              className={`score-btn ${active ? 'active' : ''}`}
              onClick={() => setTasteScore(active ? null : n)}
            >
              {n}
            </button>
          );
        })}
      </div>

      {brewTimeN != null && ratio != null && tasteScore != null ? (
        <p className={targetHit ? 'success' : 'muted'}>
          {targetHit ? 'Ziel getroffen' : 'Außerhalb Zielkorridor'}
        </p>
      ) : null}

      <label className="label">Mahlgrad-Notiz</label>
      <input
        className="input"
        placeholder="fein nachgezogen"
        value={grindNote}
        onChange={(e) => setGrindNote(e.target.value)}
      />

      <label className="label">Notiz</label>
      <textarea
        className="input"
        rows={3}
        placeholder="Geschmack, Channeling, …"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="actions">
        <button className="btn primary" type="button" disabled={saving} onClick={() => void onSave()}>
          {saving ? '…' : 'Journal speichern'}
        </button>
        {status ? <span className="success">{status}</span> : null}
      </div>
    </div>
  );
}
