export type Theme = 'light' | 'dark' | 'auto';
export type Locale = 'fr' | 'en';
export interface Prefs {
  theme?: Theme;
  locale?: Locale;
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
