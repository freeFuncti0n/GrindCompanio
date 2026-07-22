import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { JournalEntryForm } from '../components/JournalEntryForm';
import { deleteJournalEntry, getJournalEntry } from '../db/database';
import { useEffect, useState } from 'react';

export function JournalEntryPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isNew = id === 'new';
  const entryId = !isNew && id != null ? Number(id) : undefined;
  const validId = entryId != null && Number.isFinite(entryId);
  const [exists, setExists] = useState(isNew);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isNew || !validId) return;
    void getJournalEntry(entryId!).then((entry) => setExists(entry != null));
  }, [entryId, isNew, validId]);

  async function onDelete() {
    if (!validId || !window.confirm(t('journalPage.deleteConfirm'))) return;
    setDeleting(true);
    try {
      await deleteJournalEntry(entryId!);
      navigate('/journal');
    } finally {
      setDeleting(false);
    }
  }

  if (!isNew && validId && !exists) {
    return (
      <div className="page">
        <p className="muted">
          {t('journalPage.notFound')} <Link to="/journal">{t('common.back')}</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <p>
        <Link to="/journal">{t('journalPage.back')}</Link>
      </p>
      <JournalEntryForm
        entryId={validId ? entryId : undefined}
        onSaved={() => {
          if (isNew) navigate('/journal');
        }}
      />
      {validId ? (
        <div className="actions">
          <button className="btn danger" type="button" disabled={deleting} onClick={() => void onDelete()}>
            {deleting ? t('journal.saving') : t('journalPage.delete')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
