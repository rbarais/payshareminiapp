import { useI18n as useVueI18n } from 'vue-i18n';
import { i18n } from '../i18n';
import { patchPrefs, type Locale } from '../utils/prefsStorage';

// Global translator for non-component code (stores, router guards, …).
// eslint-disable-next-line id-length
export const t = i18n.global.t;

// Thin wrapper around vue-i18n that adds app-specific locale persistence.
// Components keep importing { useI18n, t } from here unchanged.
export function useI18n() {
  const { t, locale } = useVueI18n({ useScope: 'global' });
  return {
    locale,
    t,
    setLocale(next: Locale) {
      locale.value = next;
      patchPrefs({ locale: next });
    },
  };
}
