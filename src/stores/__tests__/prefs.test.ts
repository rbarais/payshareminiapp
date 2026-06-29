import { describe, it, expect, beforeEach, vi } from 'vitest';

function mockMatchMedia(dark: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: dark,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

describe('prefs (thème)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    vi.resetModules();
  });

  it('résout auto → dark quand le système est sombre', async () => {
    mockMatchMedia(true);
    const { applyTheme } = await import('../prefs');
    applyTheme();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('résout auto → light quand le système est clair', async () => {
    mockMatchMedia(false);
    const { applyTheme } = await import('../prefs');
    applyTheme();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('setTheme force la valeur, la persiste et l\'applique', async () => {
    mockMatchMedia(false);
    const { usePrefs } = await import('../prefs');
    const { setTheme, theme } = usePrefs();
    setTheme('dark');
    expect(theme.value).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(JSON.parse(localStorage.getItem('payshare_prefs')!).theme).toBe('dark');
  });
});
