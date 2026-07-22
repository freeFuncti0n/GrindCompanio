import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  createBean,
  createJournalEntry,
  getJournalBySessionId,
  getJournalEntry,
  getLastJournalDefaults,
  listBeans,
  updateJournalEntry,
  upsertJournalForSession,
} from '../db/database';
import {
  SCA_EXTRACTION_MAX,
  SCA_EXTRACTION_MIN,
  SCA_TDS_MAX,
  SCA_TDS_MIN,
  TARGET_BREW_TIME_MAX_S,
  TARGET_BREW_TIME_MIN_S,
  TARGET_RATIO_MAX,
  TARGET_RATIO_MIN,
  TARGET_TASTE_MIN,
  calcExtractionYield,
  calcRatio,
  effectiveDose,
  extractionZone,
  formatExtraction,
  formatRatio,
  isDialInHit,
  isScaExtractionHit,
  type Bean,
} from '../journal/types';

type Props = {
  entryId?: number;
  sessionId?: number;
  defaultDoseG?: number | null;
  onSaved?: () => void;
};

function parseOptionalNumber(text: string): number | null {
  const t = text.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

export function JournalEntryForm({ entryId, sessionId, defaultDoseG, onSaved }: Props) {
  const { t } = useTranslation();
  const [beans, setBeans] = useState<Bean[]>([]);
  const [resolvedEntryId, setResolvedEntryId] = useState<number | undefined>(entryId);
  const [title, setTitle] = useState('');
  const [beanId, setBeanId] = useState<number | null>(null);
  const [grindSetting, setGrindSetting] = useState('');
  const [grindNote, setGrindNote] = useState('');
  const [basket, setBasket] = useState('');
  const [dose, setDose] = useState('');
  const [brewTime, setBrewTime] = useState('');
  const [yieldG, setYieldG] = useState('');
  const [tds, setTds] = useState('');
  const [tasteScore, setTasteScore] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [newBeanName, setNewBeanName] = useState('');
  const [showNewBean, setShowNewBean] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const beanList = await listBeans();
      if (cancelled) return;
      setBeans(beanList);

      let existing = entryId != null ? await getJournalEntry(entryId) : undefined;
      if (!existing && sessionId != null) {
        existing = await getJournalBySessionId(sessionId);
      }

      if (existing) {
        setResolvedEntryId(existing.id);
        setTitle(existing.title ?? '');
        setBeanId(existing.bean_id);
        setGrindSetting(existing.grind_setting != null ? String(existing.grind_setting) : '');
        setGrindNote(existing.grind_note ?? '');
        setBasket(existing.basket ?? '');
        const doseVal = effectiveDose(existing, existing.session_dose_g);
        setDose(doseVal != null ? String(doseVal) : '');
        setBrewTime(existing.brew_time_s != null ? String(existing.brew_time_s) : '');
        setYieldG(existing.yield_g != null ? String(existing.yield_g) : '');
        setTds(existing.tds_pct != null ? String(existing.tds_pct) : '');
        setTasteScore(existing.taste_score);
        setNotes(existing.notes ?? '');
      } else {
        const defaults = await getLastJournalDefaults();
        if (cancelled) return;
        if (defaults?.bean_id != null) setBeanId(defaults.bean_id);
        if (defaults?.grind_setting != null) {
          setGrindSetting(String(defaults.grind_setting));
        }
        if (defaults?.basket) setBasket(defaults.basket);
        const initialDose = defaultDoseG ?? defaults?.dose_g;
        if (initialDose != null) setDose(String(initialDose));
      }

      if (!cancelled) setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [entryId, sessionId, defaultDoseG]);

  const doseN = parseOptionalNumber(dose);
  const brewTimeN = parseOptionalNumber(brewTime);
  const yieldN = parseOptionalNumber(yieldG);
  const tdsN = parseOptionalNumber(tds);
  const ratio = useMemo(() => calcRatio(yieldN, doseN), [yieldN, doseN]);
  const extraction = useMemo(
    () => calcExtractionYield(tdsN, yieldN, doseN),
    [tdsN, yieldN, doseN]
  );
  const zone = extractionZone(extraction);
  const dialInHit = isDialInHit({
    brew_time_s: brewTimeN,
    ratio,
    taste_score: tasteScore,
  });
  const scaHit = isScaExtractionHit(extraction);
  const isSessionLinked = sessionId != null;

  async function onSave() {
    setSaving(true);
    setStatus(null);
    try {
      const payload = {
        title: title.trim() || null,
        bean_id: beanId,
        grind_setting: parseOptionalNumber(grindSetting),
        grind_note: grindNote.trim() || null,
        basket: basket.trim() || null,
        dose_g: doseN,
        brew_time_s: brewTimeN,
        yield_g: yieldN,
        tds_pct: tdsN,
        taste_score: tasteScore,
        notes: notes.trim() || null,
      };

      if (resolvedEntryId != null) {
        await updateJournalEntry({ id: resolvedEntryId, ...payload, session_id: sessionId ?? null });
      } else if (sessionId != null) {
        const saved = await upsertJournalForSession(sessionId, payload);
        setResolvedEntryId(saved.id);
      } else {
        const saved = await createJournalEntry({ ...payload, session_id: null });
        setResolvedEntryId(saved.id);
      }

      setStatus(t('journal.saved'));
      setBeans(await listBeans());
      onSaved?.();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : t('journal.saveFailed'));
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

  if (!loaded) {
    return <div className="card journal-form muted">{t('journal.loading')}</div>;
  }

  return (
    <div className="card journal-form">
      <h2>{t('journal.title')}</h2>
      <p className="muted journal-hint">{t('journal.optionalHint')}</p>

      {!isSessionLinked ? (
        <>
          <label className="label">{t('journal.entryTitle')}</label>
          <input
            className="input"
            placeholder={t('journal.entryTitlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </>
      ) : (
        <p className="muted journal-hint">
          {t('journal.sessionHint', {
            dose: defaultDoseG != null ? defaultDoseG.toFixed(2) : t('common.dash'),
            brewMin: TARGET_BREW_TIME_MIN_S,
            brewMax: TARGET_BREW_TIME_MAX_S,
            ratioMin: TARGET_RATIO_MIN,
            ratioMax: TARGET_RATIO_MAX,
            scoreMin: TARGET_TASTE_MIN,
            eyMin: SCA_EXTRACTION_MIN,
            eyMax: SCA_EXTRACTION_MAX,
          })}
        </p>
      )}

      <label className="label">{t('journal.bean')}</label>
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
          {t('journal.new')}
        </button>
        <Link className="chip" to="/beans">
          {t('journal.all')}
        </Link>
      </div>

      {showNewBean ? (
        <div className="field-row">
          <input
            className="input"
            placeholder={t('journal.beanNamePlaceholder')}
            value={newBeanName}
            onChange={(e) => setNewBeanName(e.target.value)}
          />
          <button className="btn primary" type="button" onClick={() => void onCreateBean()}>
            {t('journal.create')}
          </button>
        </div>
      ) : null}

      <div className="field-grid">
        <div>
          <label className="label">{t('journal.grindSetting')}</label>
          <input
            className="input"
            inputMode="decimal"
            placeholder="3.5"
            value={grindSetting}
            onChange={(e) => setGrindSetting(e.target.value)}
          />
        </div>
        <div>
          <label className="label">{t('journal.dose')}</label>
          <input
            className="input"
            inputMode="decimal"
            placeholder="18"
            value={dose}
            onChange={(e) => setDose(e.target.value)}
          />
        </div>
      </div>

      <div className="field-grid">
        <div>
          <label className="label">{t('journal.brewTime')}</label>
          <input
            className="input"
            inputMode="decimal"
            placeholder="28"
            value={brewTime}
            onChange={(e) => setBrewTime(e.target.value)}
          />
        </div>
        <div>
          <label className="label">{t('journal.yield')}</label>
          <input
            className="input"
            inputMode="decimal"
            placeholder="36"
            value={yieldG}
            onChange={(e) => setYieldG(e.target.value)}
          />
        </div>
      </div>

      <div className="field-grid">
        <div>
          <label className="label">{t('journal.tds')}</label>
          <input
            className="input"
            inputMode="decimal"
            placeholder={`${SCA_TDS_MIN}–${SCA_TDS_MAX}`}
            value={tds}
            onChange={(e) => setTds(e.target.value)}
          />
          <p className="hint">{t('journal.tdsHint')}</p>
        </div>
        <div>
          <label className="label">{t('journal.doseRatio')}</label>
          <p className="computed">
            {doseN != null
              ? t('journal.doseRatioValue', { dose: doseN.toFixed(2), ratio: formatRatio(ratio) })
              : t('journal.doseRatioPending')}
          </p>
          {extraction != null ? (
            <p className={`computed ${zone === 'ideal' ? 'success' : zone ? 'warn' : ''}`}>
              {t('journal.extractionValue', { value: formatExtraction(extraction) })}
            </p>
          ) : null}
        </div>
      </div>

      <label className="label">{t('journal.basket')}</label>
      <input
        className="input"
        placeholder={t('journal.basketPlaceholder')}
        value={basket}
        onChange={(e) => setBasket(e.target.value)}
      />

      <label className="label">{t('journal.taste')}</label>
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
        <p className={dialInHit ? 'success' : 'muted'}>
          {dialInHit ? t('journal.dialInHit') : t('journal.dialInMiss')}
        </p>
      ) : null}

      {extraction != null ? (
        <p className={scaHit ? 'success' : 'muted'}>
          {scaHit
            ? t('journal.scaHit', { min: SCA_EXTRACTION_MIN, max: SCA_EXTRACTION_MAX })
            : zone === 'under'
              ? t('journal.scaUnder', { min: SCA_EXTRACTION_MIN })
              : zone === 'over'
                ? t('journal.scaOver', { max: SCA_EXTRACTION_MAX })
                : t('journal.scaMiss')}
        </p>
      ) : null}

      <label className="label">{t('journal.grindNote')}</label>
      <input
        className="input"
        placeholder={t('journal.grindNotePlaceholder')}
        value={grindNote}
        onChange={(e) => setGrindNote(e.target.value)}
      />

      <label className="label">{t('journal.notes')}</label>
      <textarea
        className="input"
        rows={3}
        placeholder={t('journal.notesPlaceholder')}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="actions">
        <button className="btn primary" type="button" disabled={saving} onClick={() => void onSave()}>
          {saving ? t('journal.saving') : t('journal.save')}
        </button>
        {status ? <span className="success">{status}</span> : null}
      </div>
    </div>
  );
}
