import { reactive, computed } from 'vue';
import { getHostLanguage } from '@nimiq/mini-app-sdk';
import { messages } from '../i18n';
import { readPrefs, patchPrefs, type Locale } from '../utils/prefsStorage';

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

const state = reactive<{ locale: Locale }>({ locale: initialLocale() });

function lookup(locale: Locale, key: string): string | undefined {
  const value = key
    .split('.')
    .reduce<unknown>(
      (currNode, keySegment) =>
        currNode && typeof currNode === 'object'
          ? (currNode as Record<string, unknown>)[keySegment]
          : undefined,
      messages[locale],
    );
  return typeof value === 'string' ? value : undefined;
}

// eslint-disable-next-line id-length
export function t(key: string, params?: Record<string, string | number>): string {
  const locale = state.locale; // lecture réactive → re-render au changement
  let str = lookup(locale, key) ?? lookup('fr', key) ?? key;
  if (params) {
    for (const [paramName, paramValue] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${paramName}\\}`, 'g'), String(paramValue));
    }
  }
  return str;
}

export function useI18n() {
  return {
    locale: computed(() => state.locale),
    t,
    setLocale(locale: Locale) {
      state.locale = locale;
      patchPrefs({ locale });
    },
  };
}
