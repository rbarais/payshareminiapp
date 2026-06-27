import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../nimiq', () => ({
  signMessage: vi.fn(async () => ({ publicKey: 'pk', signature: 'sig' })),
  detectNimiqApp: vi.fn(async () => true),
}));

describe('authenticate', () => {
  beforeEach(() => localStorage.clear());
  it('stores the JWT returned by auth-verify', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ challenge: 'C' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'ey.jwt' }) });
    vi.stubGlobal('fetch', fetchMock);

    const { authenticate } = await import('../auth');
    await authenticate('NQ_ALICE');

    const { getStoredJwt } = await import('../auth');
    expect(getStoredJwt()).toBe('ey.jwt');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
