import { ref } from 'vue';
import { getExchangeRates, CryptoCurrency, FiatCurrency, Provider } from '@nimiq/utils/fiat-api';
import { currency } from '../stores/prefs';
import { i18n } from '../i18n';
import type { Currency } from './prefsStorage';

const CACHE_KEY = 'payshare_rates';
const TTL_MS = 10 * 60 * 1000;
const CPL_URL =
  'https://firestore.googleapis.com/v1/projects/checkout-service/databases/(default)/documents/exchangerates/rates';

export type Rates = Partial<Record<Currency, number>>;

interface Entry {
  rates: Rates;
  ts: number;
}

function readEntry(): Entry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry;
    return parsed && typeof parsed.ts === 'number' && parsed.rates ? parsed : null;
  } catch {
    return null;
  }
}

export const rates = ref<Rates | null>(readEntry()?.rates ?? null);

export function fiatApprox(nim: number): string {
  const code = currency.value;
  const rate = rates.value?.[code];
  if (rate === undefined) return '';
  const formatted = new Intl.NumberFormat(i18n.global.locale.value, {
    style: 'currency',
    currency: code.toUpperCase(),
  }).format(nim * rate);
  return `≈ ${formatted}`;
}

// Le colón n'est plus servi par le service amont de la lib ; le document que
// celle-ci interroge déjà pour le dalasi contient pourtant un USD/CRC à jour.
function readUsdCrc(doc: unknown): number | null {
  if (typeof doc !== 'object' || doc === null) return null;
  const fields = (doc as Record<string, unknown>).fields;
  if (typeof fields !== 'object' || fields === null) return null;
  const ratesField = (fields as Record<string, unknown>).rates;
  if (typeof ratesField !== 'object' || ratesField === null) return null;
  const mapValue = (ratesField as Record<string, unknown>).mapValue;
  if (typeof mapValue !== 'object' || mapValue === null) return null;
  const inner = (mapValue as Record<string, unknown>).fields;
  if (typeof inner !== 'object' || inner === null) return null;
  const crc = (inner as Record<string, unknown>).CRC;
  if (typeof crc !== 'object' || crc === null) return null;
  const { doubleValue, integerValue } = crc as Record<string, unknown>;
  if (typeof doubleValue === 'number') return doubleValue;
  if (typeof integerValue === 'string') return Number(integerValue);
  return null;
}

async function fetchUsdCrc(): Promise<number | null> {
  try {
    const res = await fetch(CPL_URL);
    if (!res.ok) return null;
    return readUsdCrc(await res.json());
  } catch {
    return null;
  }
}

export async function fetchRates(): Promise<void> {
  const entry = readEntry();
  if (entry && Date.now() - entry.ts < TTL_MS) {
    rates.value = entry.rates;
    return;
  }
  try {
    const { nim } = await getExchangeRates(
      [CryptoCurrency.NIM],
      [FiatCurrency.USD, FiatCurrency.EUR, FiatCurrency.CRC, FiatCurrency.GMD],
      Provider.CoinGecko,
    );
    const next: Rates = { usd: nim.usd, eur: nim.eur, crc: nim.crc, gmd: nim.gmd };
    if (next.crc === undefined && next.usd !== undefined) {
      const usdCrc = await fetchUsdCrc();
      if (usdCrc !== null) next.crc = next.usd * usdCrc;
    }
    rates.value = next;
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rates: next, ts: Date.now() }));
  } catch {
    // Réseau indisponible : on garde les derniers taux connus.
  }
}
