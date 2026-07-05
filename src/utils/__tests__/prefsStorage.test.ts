import { describe, it, expect, beforeEach } from 'vitest';
import { readPrefs, patchPrefs } from '../prefsStorage';

describe('prefsStorage', () => {
  beforeEach(() => localStorage.clear());

  it('renvoie un objet vide quand rien n\'est stocké', () => {
    expect(readPrefs()).toEqual({});
  });

  it('merge les patchs successifs sans perdre les clés', () => {
    patchPrefs({ theme: 'dark' });
    patchPrefs({ locale: 'en' });
    expect(readPrefs()).toEqual({ theme: 'dark', locale: 'en' });
  });

  it('tolère un JSON corrompu en renvoyant {}', () => {
    localStorage.setItem('payshare_prefs', '{not json');
    expect(readPrefs()).toEqual({});
  });

  it('persiste et relit displayName', () => {
    patchPrefs({ displayName: 'Thomas' });
    expect(readPrefs().displayName).toBe('Thomas');
  });
});
