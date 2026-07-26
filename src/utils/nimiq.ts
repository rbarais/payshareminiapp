import { init } from '@nimiq/mini-app-sdk';
import type { NimiqProvider } from '@nimiq/mini-app-sdk';
import { readPrefs } from './prefsStorage';

// ─────────────────────────────────────────────────────────────────────────
// Nimiq provider initialization.
//
// Following the official tutorial: we call `init({ timeout })` ONCE at startup
// (App.vue onMounted) and keep the promise. `init()` polls for the injection of
// `window.nimiq` and rejects after the timeout if we are not inside Nimiq Pay.
// All provider calls below await this same promise — no second call.
//
// Knowing WHERE we run is a separate question, answered by `isNimiqHost()`:
// waiting for `init()` to reject would cost the full SDK timeout (10s) before
// the login screen can offer anything usable outside Nimiq Pay.
// ─────────────────────────────────────────────────────────────────────────

let nimiqPromise: Promise<NimiqProvider> | null = null;

// Grace period for a host that injects `window.nimiq` without seeding
// `window.nimiqPay` — far shorter than the SDK's 10s default.
const HOST_PROBE_TIMEOUT_MS = 1500;

/** Start (or reuse) the provider initialization. */
export function initNimiq(): Promise<NimiqProvider> {
  if (!nimiqPromise) {
    nimiqPromise = init();
  }
  return nimiqPromise;
}

/**
 * Are we inside the Nimiq Pay WebView? Synchronous and available on the first
 * paint: Nimiq Pay seeds `window.nimiqPay` (host language, device identifier)
 * BEFORE the mini-app page script runs. `window.nimiq` — the provider — is
 * injected later, so it only confirms the host, it cannot rule it out.
 */
export function isNimiqHost(): boolean {
  return typeof window !== 'undefined' && (!!window.nimiqPay || !!window.nimiq);
}

/**
 * Detect whether the app runs inside Nimiq Pay. The host marker answers
 * instantly; without it we still give the provider a short window before
 * concluding we are in a plain browser.
 */
export async function detectNimiqApp(): Promise<boolean> {
  if (isNimiqHost()) {
    // Warm up the provider promise without blocking the answer.
    initNimiq().catch(() => {});
    return true;
  }
  try {
    await init({ timeout: HOST_PROBE_TIMEOUT_MS });
    return true;
  } catch {
    return false;
  }
}

/** Provider if available, otherwise null (outside Nimiq Pay). Never rejects. */
async function getProvider(): Promise<NimiqProvider | null> {
  try {
    return await initNimiq();
  } catch {
    return null;
  }
}

const PROVIDER_TIMEOUT_MS = 5000;

/**
 * Bound a provider call in time. If the WebView is suspended mid-call (screen
 * locked), the native bridge never answers: the promise neither resolves nor
 * rejects, so a try/catch cannot save the caller. Resolve to null instead of
 * hanging forever.
 */
function withTimeout<T>(promise: Promise<T>): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const fallback = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), PROVIDER_TIMEOUT_MS);
  });
  return Promise.race([promise, fallback]).finally(() => clearTimeout(timer));
}

/** Get the current user's Nimiq address (triggers the access dialog). */
export async function getNimiqAddress(): Promise<string> {
  const provider = await initNimiq();
  const accounts = await provider.listAccounts();

  if (typeof accounts === 'object' && 'error' in accounts) {
    throw new Error(accounts.error.message);
  }
  return accounts[0];
}

/**
 * Get the current user's address + name.
 *
 * Outside Nimiq Pay (dev browser, init rejected), returns a fake user to allow
 * testing. INSIDE Nimiq Pay, propagates errors (e.g. access dialog refused)
 * instead of hiding them.
 */
export async function getCurrentUser(): Promise<{ id: string; name: string; addresses: string[] }> {
  const provider = await getProvider();
  if (!provider) {
    return {
      id: 'dev_' + Math.random().toString(36).slice(2, 11),
      name: readPrefs().displayName || 'Dev User',
      addresses: [],
    };
  }

  const accounts = await provider.listAccounts();

  if (typeof accounts === 'object' && 'error' in accounts) {
    throw new Error(accounts.error.message);
  }
  const address = accounts[0];
  const name = readPrefs().displayName ?? '';
  return { id: address, name: name || 'User ' + address.slice(0, 6), addresses: accounts };
}

/**
 * Read the network consensus state. Returns null outside Nimiq Pay (dev browser)
 * or if the provider call fails, so callers can show a "connecting" state.
 */
export async function getConsensusEstablished(): Promise<boolean | null> {
  const provider = await getProvider();
  if (!provider) return null;
  try {
    return await withTimeout(provider.isConsensusEstablished());
  } catch {
    return null;
  }
}

/** Current Nimiq block height, or null outside Nimiq Pay / on failure. */
export async function getBlockNumber(): Promise<number | null> {
  const provider = await getProvider();
  if (!provider) return null;
  try {
    return await withTimeout(provider.getBlockNumber());
  } catch {
    return null;
  }
}

/** Truncate a Nimiq address for display: "NQ48 8CKH…BA76". */
export function formatAddressShort(address: string): string {
  if (!address) return '';
  const clean = address.trim();
  if (clean.length <= 13) return clean;
  return `${clean.slice(0, 9)}…${clean.slice(-4)}`;
}

/**
 * Open a payment request through the Nimiq provider.
 * @param amount Amount to pay (in NIM)
 * @param recipient Recipient address
 * @param reason Payment reason (the `data` field)
 */
export async function requestPayment(
  amount: number,
  recipient: string,
  reason: string,
): Promise<string | void> {
  const provider = await initNimiq();

  // 1 NIM = 100 000 Luna
  const valueInLunas = Math.round(amount * 100000);

  const result = await provider.sendBasicTransactionWithData({
    recipient,
    value: valueInLunas,
    data: reason,
  });

  if (typeof result === 'object' && result !== null) {
    if ('error' in result) {
      throw new Error(result.error.message);
    }
    // Some SDK versions resolve with the raw JSON-RPC error { code, message }
    // instead of the documented ErrorResponse format.
    if ('code' in result && 'message' in result) {
      throw new Error((result as unknown as { message: string }).message);
    }
  }
  return result as string;
}

/** Sign a message through the provider. Returns publicKey + signature (hex). */
export async function signMessage(
  message: string,
): Promise<{ publicKey: string; signature: string }> {
  const provider = await initNimiq();
  const result = await provider.sign(message);
  if (typeof result === 'object' && 'error' in result) {
    throw new Error(result.error.message);
  }
  return { publicKey: result.publicKey, signature: result.signature };
}
