import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import de from './locales/de.json';
import en from './locales/en.json';

export const LOCALE_STORAGE_KEY = 'grind-companion.locale';
export const SUPPORTED_LOCALES = ['de', 'en'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

function readStoredLocale(): AppLocale {
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
  if (stored === 'de' || stored === 'en') return stored;
  const browser = navigator.language.toLowerCase();
  return browser.startsWith('de') ? 'de' : 'en';
}

void i18n.use(initReactI18next).init({
  resources: {
    de: { translation: de },
    en: { translation: en },
  },
  lng: readStoredLocale(),
  fallbackLng: 'de',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(LOCALE_STORAGE_KEY, lng);
  document.documentElement.lang = lng;
});

document.documentElement.lang = i18n.language;

export default i18n;
