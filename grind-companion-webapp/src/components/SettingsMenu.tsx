import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppLocale } from '../i18n';

function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M19.4 13.5a7.4 7.4 0 0 0 .1-3l2-1.2-2-3.5-2.3.7a7.5 7.5 0 0 0-2.6-1.5L14.5 2h-5L9.4 5.5a7.5 7.5 0 0 0-2.6 1.5l-2.3-.7-2 3.5 2 1.2a7.4 7.4 0 0 0 .1 3l-2 1.2 2 3.5 2.3-.7a7.5 7.5 0 0 0 2.6 1.5L9.5 22h5l.5-3.5a7.5 7.5 0 0 0 2.6-1.5l2.3.7 2-3.5-2-1.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SettingsMenu() {
  const { t, i18n } = useTranslation();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const current = i18n.language.startsWith('en') ? 'en' : 'de';

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function setLocale(locale: AppLocale) {
    void i18n.changeLanguage(locale);
    setOpen(false);
  }

  return (
    <div className="settings-menu" ref={rootRef}>
      <button
        type="button"
        className="icon-btn"
        aria-label={t('settings.open')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
      >
        <GearIcon />
      </button>

      {open ? (
        <div className="settings-dropdown" id={menuId} role="menu">
          <div className="settings-section-label">{t('settings.language')}</div>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={current === 'de'}
            className={`settings-item ${current === 'de' ? 'active' : ''}`}
            onClick={() => setLocale('de')}
          >
            {t('settings.de')}
          </button>
          <button
            type="button"
            role="menuitemradio"
            aria-checked={current === 'en'}
            className={`settings-item ${current === 'en' ? 'active' : ''}`}
            onClick={() => setLocale('en')}
          >
            {t('settings.en')}
          </button>
        </div>
      ) : null}
    </div>
  );
}
