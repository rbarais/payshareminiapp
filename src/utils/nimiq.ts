import { init } from '@nimiq/mini-app-sdk';
import type { NimiqProvider } from '@nimiq/mini-app-sdk';
import { readPrefs } from './prefsStorage';

// ─────────────────────────────────────────────────────────────────────────
// Nimiq provider initialization.
//
// Following the official tutorial: we call `init({ timeout })` ONCE at startup
// (App.vue onMounted) and keep the promise. `init()` polls for the injection of
// `window.nimiq` and rejects after the timeout if we are not inside Nimiq Pay.
// All functions below await this same promise — no second call, no dependency
// on an unreliable synchronous check.
// ─────────────────────────────────────────────────────────────────────────

let nimiqPromise: Promise<NimiqProvider> | null = null;

/** Start (or reuse) the provider initialization. */
export function initNimiq(): Promise<NimiqProvider> {
  if (!nimiqPromise) {
    nimiqPromise = init();
  }
  return nimiqPromise;
}

/**
 * Detect whether the app runs inside Nimiq Pay: true if the provider
 * initializes, false if `init()` rejects (provider never injected). Reuses the
 * shared init promise — no extra `init()` call.
 */
export async function detectNimiqApp(): Promise<boolean> {
  try {
    await initNimiq();
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
export async function getCurrentUser(): Promise<{ id: string; name: string }> {
  const provider = await getProvider();
  if (!provider) {
    return {
      id: 'dev_' + Math.random().toString(36).slice(2, 11),
      name: readPrefs().displayName || 'Dev User',
    };
  }

  const accounts = await provider.listAccounts();
  if (typeof accounts === 'object' && 'error' in accounts) {
    throw new Error(accounts.error.message);
  }
  const address = accounts[0];
  const name = readPrefs().displayName ?? '';
  return { id: address, name: name || 'User ' + address.slice(0, 6) };
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

/**
 * Synchronous check (provider already injected?). Unreliable right after load —
 * prefer `detectNimiqApp()` / the store's `isNimiqApp` state.
 */
export function isNimiqEnvironment(): boolean {
  return typeof window !== 'undefined' && !!window.nimiq;
}
