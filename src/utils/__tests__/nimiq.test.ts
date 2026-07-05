import { describe, it, expect, beforeEach, vi } from 'vitest';

// Hors Nimiq Pay : init() rejette → getProvider() renvoie null → branche "dev".
vi.mock('@nimiq/mini-app-sdk', () => ({
  init: () => Promise.reject(new Error('no provider')),
}));

describe('getCurrentUser', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  it('utilise le displayName choisi comme nom', async () => {
    localStorage.setItem('payshare_prefs', JSON.stringify({ displayName: 'Thomas' }));
    const { getCurrentUser } = await import('../nimiq');
    const user = await getCurrentUser();
    expect(user.name).toBe('Thomas');
  });

  it('retombe sur "Dev User" hors Nimiq Pay sans nom choisi', async () => {
    const { getCurrentUser } = await import('../nimiq');
    const user = await getCurrentUser();
    expect(user.name).toBe('Dev User');
  });
});
