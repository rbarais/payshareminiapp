import { describe, it, expect, beforeEach, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getExchangeRates: vi.fn() }));

vi.mock('@nimiq/utils/fiat-api', () => ({
  CryptoCurrency: { NIM: 'nim' },
  FiatCurrency: { USD: 'usd', EUR: 'eur', CRC: 'crc', GMD: 'gmd' },
  Provider: { CoinGecko: 'CoinGecko' },
  getExchangeRates: mocks.getExchangeRates,
}));

const FULL = { usd: 0.0005, eur: 0.00043, crc: 0.227, gmd: 0.037 };

function firestoreDoc(crc: number) {
  return {
    ok: true,
    json: async () => ({
      fields: { rates: { mapValue: { fields: { CRC: { doubleValue: crc } } } } },
    }),
  };
}

describe('rate', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
    vi.restoreAllMocks();
    mocks.getExchangeRates.mockReset();
  });

  it('expose les quatre taux et les met en cache', async () => {
    mocks.getExchangeRates.mockResolvedValue({ nim: FULL });
    const { fetchRates, rates } = await import('../rate');
    await fetchRates();
    expect(rates.value).toEqual(FULL);
    expect(JSON.parse(localStorage.getItem('payshare_rates')!).rates).toEqual(FULL);
  });

  it('interroge CoinGecko explicitement, pas le provider par défaut', async () => {
    mocks.getExchangeRates.mockResolvedValue({ nim: FULL });
    const { fetchRates } = await import('../rate');
    await fetchRates();
    expect(mocks.getExchangeRates).toHaveBeenCalledWith(
      ['nim'],
      ['usd', 'eur', 'crc', 'gmd'],
      'CoinGecko',
    );
  });

  it('sert un cache frais sans refetch', async () => {
    localStorage.setItem('payshare_rates', JSON.stringify({ rates: FULL, ts: Date.now() }));
    const { fetchRates, rates } = await import('../rate');
    await fetchRates();
    expect(mocks.getExchangeRates).not.toHaveBeenCalled();
    expect(rates.value).toEqual(FULL);
  });

  it('ignore un cache mal formé (valeur non numérique) et refetch', async () => {
    localStorage.setItem(
      'payshare_rates',
      JSON.stringify({ rates: { usd: 'abc' }, ts: Date.now() }),
    );
    mocks.getExchangeRates.mockResolvedValue({ nim: FULL });
    const { fetchRates, rates } = await import('../rate');
    await fetchRates();
    expect(mocks.getExchangeRates).toHaveBeenCalled();
    expect(rates.value).toEqual(FULL);
  });

  it('refetch si le cache est périmé (> 10 min)', async () => {
    localStorage.setItem(
      'payshare_rates',
      JSON.stringify({ rates: FULL, ts: Date.now() - 11 * 60 * 1000 }),
    );
    const frais = { ...FULL, usd: 0.0006 };
    mocks.getExchangeRates.mockResolvedValue({ nim: frais });
    const { fetchRates, rates } = await import('../rate');
    await fetchRates();
    expect(rates.value).toEqual(frais);
  });

  it('sur échec réseau, ne jette pas et conserve les derniers taux connus', async () => {
    localStorage.setItem(
      'payshare_rates',
      JSON.stringify({ rates: FULL, ts: Date.now() - 11 * 60 * 1000 }),
    );
    mocks.getExchangeRates.mockRejectedValue(new Error('offline'));
    const { fetchRates, rates } = await import('../rate');
    await expect(fetchRates()).resolves.toBeUndefined();
    expect(rates.value).toEqual(FULL);
  });

  it('calcule le CRC via le secours Firestore quand la lib ne le rend pas', async () => {
    mocks.getExchangeRates.mockResolvedValue({ nim: { ...FULL, crc: undefined } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(firestoreDoc(455)));
    const { fetchRates, rates } = await import('../rate');
    await fetchRates();
    expect(rates.value!.crc).toBeCloseTo(0.0005 * 455, 10);
  });

  it('laisse le CRC sans taux quand le secours échoue aussi', async () => {
    mocks.getExchangeRates.mockResolvedValue({ nim: { ...FULL, crc: undefined } });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const { fetchRates, rates } = await import('../rate');
    await fetchRates();
    expect(rates.value!.crc).toBeUndefined();
    expect(rates.value!.usd).toBe(0.0005);
  });

  it('fiatApprox suit la devise sélectionnée', async () => {
    mocks.getExchangeRates.mockResolvedValue({ nim: FULL });
    const { fetchRates, fiatApprox } = await import('../rate');
    const { setCurrency } = await import('../../stores/prefs');
    await fetchRates();

    setCurrency('eur');
    const enEur = fiatApprox(1000);
    expect(enEur).toContain('≈');
    expect(enEur).toContain('€');

    setCurrency('usd');
    expect(fiatApprox(1000)).toMatch(/[$]/);
  });

  it('fiatApprox rend une chaîne vide quand le taux est inconnu', async () => {
    const { fiatApprox } = await import('../rate');
    const { setCurrency } = await import('../../stores/prefs');
    setCurrency('crc');
    expect(fiatApprox(1000)).toBe('');
  });
});
