import { reactive, computed } from 'vue';
import { readPrefs, patchPrefs, type Theme } from '../utils/prefsStorage';

const state = reactive<{ theme: Theme; displayName: string }>({
  theme: readPrefs().theme ?? 'auto',
  displayName: readPrefs().displayName ?? '',
});

let listenerInstalled = false;

function systemDark(): boolean {
  return (
    typeof matchMedia === 'function' &&
    matchMedia('(prefers-color-scheme: dark)').matches
  );
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
  };
}
