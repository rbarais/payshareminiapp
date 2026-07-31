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

describe('isJwtExpired', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  const makeJwt = (exp: number): string => {
    const payload = btoa(JSON.stringify({ exp })).replace(/\+/g, '-').replace(/\//g, '_');
    return `header.${payload}.signature`;
  };

  it('returns true when no token is stored', async () => {
    const { isJwtExpired } = await import('../auth');
    expect(isJwtExpired()).toBe(true);
  });

  it('returns false for a token valid well into the future', async () => {
    const { isJwtExpired, setStoredJwt } = await import('../auth');
    setStoredJwt(makeJwt(Date.now() / 1000 + 3600));
    expect(isJwtExpired()).toBe(false);
  });

  it('returns true for an already expired token', async () => {
    const { isJwtExpired, setStoredJwt } = await import('../auth');
    setStoredJwt(makeJwt(Date.now() / 1000 - 10));
    expect(isJwtExpired()).toBe(true);
  });

  it('treats the last 30 seconds of validity as expired', async () => {
    const { isJwtExpired, setStoredJwt } = await import('../auth');
    setStoredJwt(makeJwt(Date.now() / 1000 + 10));
    expect(isJwtExpired()).toBe(true);
  });

  it('returns true for a malformed token', async () => {
    const { isJwtExpired, setStoredJwt } = await import('../auth');
    setStoredJwt('not-a-jwt');
    expect(isJwtExpired()).toBe(true);
  });
});
