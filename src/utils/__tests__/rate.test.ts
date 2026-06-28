import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

describe('rate', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    vi.restoreAllMocks();
  });
  afterEach(() => vi.useRealTimers());

  it('fetch et met en cache le taux', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ 'nimiq-2': { eur: 0.002 } }),
      }),
    );
    const { fetchRate, eurRate } = await import('../rate');
    const r = await fetchRate();
    expect(r).toBe(0.002);
    expect(eurRate.value).toBe(0.002);
    expect(JSON.parse(localStorage.getItem('payshare_rate')!).rate).toBe(0.002);
  });

  it('renvoie le cache frais sans refetch', async () => {
    localStorage.setItem(
      'payshare_rate',
      JSON.stringify({ rate: 0.0015, ts: Date.now() }),
    );
    const spy = vi.fn();
    vi.stubGlobal('fetch', spy);
    const { fetchRate } = await import('../rate');
    expect(await fetchRate()).toBe(0.0015);
    expect(spy).not.toHaveBeenCalled();
  });

  it('refetch si le cache est périmé (> 10 min)', async () => {
    localStorage.setItem(
      'payshare_rate',
      JSON.stringify({ rate: 0.0015, ts: Date.now() - 11 * 60 * 1000 }),
    );
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ 'nimiq-2': { eur: 0.0021 } }),
      }),
    );
    const { fetchRate } = await import('../rate');
    expect(await fetchRate()).toBe(0.0021);
  });

  it('sur échec réseau, ne jette pas et renvoie le dernier taux connu', async () => {
    localStorage.setItem(
      'payshare_rate',
      JSON.stringify({ rate: 0.0015, ts: Date.now() - 11 * 60 * 1000 }),
    );
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { fetchRate } = await import('../rate');
    expect(await fetchRate()).toBe(0.0015);
  });
});
