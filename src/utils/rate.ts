import { ref } from 'vue';

const CACHE_KEY = 'payshare_rate';
const TTL_MS = 10 * 60 * 1000;
const URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=nimiq-2&vs_currencies=eur';

interface Entry {
  rate: number;
  ts: number;
}

function readEntry(): Entry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Entry;
    return typeof parsed.rate === 'number' && typeof parsed.ts === 'number'
      ? parsed
      : null;
  } catch {
    return null;
  }
}

export const eurRate = ref<number | null>(readEntry()?.rate ?? null);

export async function fetchRate(): Promise<number | null> {
  const entry = readEntry();
  if (entry && Date.now() - entry.ts < TTL_MS) {
    eurRate.value = entry.rate;
    return entry.rate;
  }
  try {
    const res = await fetch(URL);
    if (!res.ok) return eurRate.value;
    const data = (await res.json()) as Record<string, { eur?: number }>;
    const rate = data['nimiq-2']?.eur;
    if (typeof rate === 'number') {
      eurRate.value = rate;
      localStorage.setItem(CACHE_KEY, JSON.stringify({ rate, ts: Date.now() }));
    }
    return eurRate.value;
  } catch {
    return eurRate.value;
  }
}
