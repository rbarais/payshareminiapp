import { createI18n } from 'vue-i18n';
import { getHostLanguage } from '@nimiq/mini-app-sdk';
import fr from './fr.json';
import en from './en.json';
import de from './de.json';
import es from './es.json';
import { readPrefs, type Locale } from '../utils/prefsStorage';

export type Dict = typeof en;

export const messages: Record<Locale, Dict> = { fr, en, de, es };

export const FALLBACK_LOCALE: Locale = 'en';

const SUPPORTED: Locale[] = ['fr', 'en', 'de', 'es'];

function isLocale(value: string): value is Locale {
  return (SUPPORTED as string[]).includes(value);
}

// Nimiq Pay expose sa langue (ISO 639-1) dans window.nimiqPay.language : en, es,
// de, fr, pt. `pt` n'est pas encore traduit ici → il retombe sur l'anglais.
function hostLocale(): string {
  try {
    return (getHostLanguage() || '').slice(0, 2).toLowerCase();
  } catch {
    return '';
  }
}

function initialLocale(): Locale {
  const stored = readPrefs().locale;
  if (stored && isLocale(stored)) return stored;
  const host = hostLocale();
  if (isLocale(host)) return host;
  const device = (navigator.language || '').slice(0, 2).toLowerCase();
  return isLocale(device) ? device : FALLBACK_LOCALE;
}

export const i18n = createI18n<[Dict], Locale, false>({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: FALLBACK_LOCALE,
  messages,
  pluralRules: {
    fr: (choice: number) => (Math.abs(choice) <= 1 ? 0 : 1),
  },
});
