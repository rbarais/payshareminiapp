export type Theme = 'light' | 'dark' | 'auto';
export type Locale = 'fr' | 'en' | 'de' | 'es';
export type Currency = 'usd' | 'eur' | 'crc' | 'gmd';
export interface Prefs {
  theme?: Theme;
  locale?: Locale;
  currency?: Currency;
  displayName?: string;
}

const KEY = 'payshare_prefs';

export function readPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Prefs) : {};
  } catch {
    return {};
  }
}

export function patchPrefs(patch: Partial<Prefs>): void {
  const next = { ...readPrefs(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
}
