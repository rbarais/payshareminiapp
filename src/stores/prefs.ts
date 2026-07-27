import { reactive, computed } from 'vue';
import { readPrefs, patchPrefs, type Theme, type Currency } from '../utils/prefsStorage';

const state = reactive<{ theme: Theme; displayName: string; currency: Currency }>({
  theme: readPrefs().theme ?? 'auto',
  displayName: readPrefs().displayName ?? '',
  currency: readPrefs().currency ?? 'usd',
});

let listenerInstalled = false;

function systemDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches;
}

function resolve(theme: Theme): 'light' | 'dark' {
  if (theme === 'auto') return systemDark() ? 'dark' : 'light';
  return theme;
}

export function applyTheme(): void {
  document.documentElement.setAttribute('data-theme', resolve(state.theme));
  if (!listenerInstalled && typeof matchMedia === 'function') {
    listenerInstalled = true;
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (state.theme === 'auto') {
        document.documentElement.setAttribute('data-theme', resolve('auto'));
      }
    });
  }
}

export const currency = computed(() => state.currency);

export function setCurrency(next: Currency): void {
  state.currency = next;
  patchPrefs({ currency: next });
}

export function usePrefs() {
  return {
    theme: computed(() => state.theme),
    setTheme(theme: Theme) {
      state.theme = theme;
      patchPrefs({ theme });
      applyTheme();
    },
    displayName: computed(() => state.displayName),
    setDisplayName(name: string) {
      state.displayName = name;
      patchPrefs({ displayName: name });
    },
    currency,
    setCurrency,
  };
}
