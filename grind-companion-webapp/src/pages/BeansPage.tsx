import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { createBean, listBeans } from '../db/database';
import type { Bean } from '../journal/types';

export function BeansPage() {
  const { t } = useTranslation();
  const [beans, setBeans] = useState<Bean[]>([]);
  const [name, setName] = useState('');
  const [roaster, setRoaster] = useState('');
  const [origin, setOrigin] = useState('');

  const refresh = () => void listBeans().then(setBeans);
  useEffect(() => {
    refresh();
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await createBean({
      name,
      roaster: roaster || null,
      origin: origin || null,
    });
    setName('');
    setRoaster('');
    setOrigin('');
    refresh();
  }

  return (
    <div className="page">
      <p>
        <Link to="/analytics">{t('common.backToAnalytics')}</Link>
      </p>
      <h1>{t('beans.title')}</h1>
      <form className="card" onSubmit={onSubmit}>
        <label className="label">{t('common.name')}</label>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
        <label className="label">{t('beans.roaster')}</label>
        <input className="input" value={roaster} onChange={(e) => setRoaster(e.target.value)} />
        <label className="label">{t('beans.origin')}</label>
        <input className="input" value={origin} onChange={(e) => setOrigin(e.target.value)} />
        <button className="btn primary" type="submit">
          {t('beans.add')}
        </button>
      </form>
      <ul className="session-list">
        {beans.map((b) => (
          <li key={b.id}>
            <strong>{b.name}</strong>
            {b.roaster ? <span className="muted"> · {b.roaster}</span> : null}
            {b.origin ? <span className="muted"> · {b.origin}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
