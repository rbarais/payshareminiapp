import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({ detectNimiqApp: vi.fn() }));

vi.mock('../nimiq', () => ({
  detectNimiqApp: mocks.detectNimiqApp,
  signMessage: vi.fn(),
}));

describe('authenticate (navigateur de dev, hors Nimiq Pay)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    mocks.detectNimiqApp.mockResolvedValue(false);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('stores the JWT returned by /api/auth/token', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: 'ey.jwt' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const { authenticate, getStoredJwt } = await import('../auth');
    await authenticate('NQ_ALICE');

    expect(getStoredJwt()).toBe('ey.jwt');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [path, init] = fetchMock.mock.calls[0];
    expect(path).toBe('/api/auth/token');
    expect(JSON.parse(init.body)).toEqual({ devAddress: 'NQ_ALICE' });
  });
});
