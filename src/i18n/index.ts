import { createI18n } from 'vue-i18n';
import { getHostLanguage } from '@nimiq/mini-app-sdk';
import { fr } from './fr';
import { en } from './en';
import { readPrefs, type Locale } from '../utils/prefsStorage';

export type Dict = typeof fr;

export const messages: Record<Locale, Dict> = { fr, en };

function initialLocale(): Locale {
  const stored = readPrefs().locale;
  if (stored === 'fr' || stored === 'en') return stored;
  let host: string;
  try {
    host = (getHostLanguage() || '').slice(0, 2);
  } catch {
    host = (navigator.language || '').slice(0, 2);
  }
  return host === 'en' ? 'en' : 'fr';
}

export const i18n = createI18n<[Dict], Locale, false>({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: 'fr',
  messages,
  pluralRules: {
    // En français, 0 et 1 sont au singulier ("0 dépense", "1 dépense"),
    // au-delà au pluriel. (En anglais, seul 1 est au singulier → règle par défaut.)
    fr: (choice: number) => (Math.abs(choice) <= 1 ? 0 : 1),
  },
});
