import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({ reportApiOutcome: vi.fn() }));

vi.mock('../../stores/connection', () => ({
  reportApiOutcome: mocks.reportApiOutcome,
  refreshConnection: vi.fn(),
  useConnection: vi.fn(),
}));

describe('apiFetch connection reporting', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    mocks.reportApiOutcome.mockClear();
  });

  afterEach(() => vi.unstubAllGlobals());

  it('reports the API as unreachable when fetch rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

    const { fetchMyGroups } = await import('../api');
    await expect(fetchMyGroups()).rejects.toThrow();

    expect(mocks.reportApiOutcome).toHaveBeenCalledWith(false);
  });

  it('reports the API as reachable on a successful response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, status: 200, text: async () => '[]' }),
    );

    const { fetchMyGroups } = await import('../api');
    await fetchMyGroups();

    expect(mocks.reportApiOutcome).toHaveBeenCalledWith(true);
  });

  it('reports the API as reachable on a 500 — the server answered', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => '' }),
    );

    const { fetchMyGroups } = await import('../api');
    await expect(fetchMyGroups()).rejects.toThrow('API 500');

    expect(mocks.reportApiOutcome).toHaveBeenCalledWith(true);
  });

  it('clears the JWT before reporting on a 401', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, text: async () => '' }),
    );

    const { setStoredJwt, getStoredJwt } = await import('../auth');
    setStoredJwt('ey.jwt');

    const { fetchMyGroups } = await import('../api');
    await expect(fetchMyGroups()).rejects.toThrow('Session expirée');

    expect(getStoredJwt()).toBeNull();
    expect(mocks.reportApiOutcome).toHaveBeenCalledWith(true);
  });
});
