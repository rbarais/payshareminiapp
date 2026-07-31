import { getHostLanguage } from '@nimiq/mini-app-sdk';
import { signMessage, detectNimiqApp } from './nimiq';

const JWT_KEY = 'payshare_jwt';

export function getStoredJwt(): string | null {
  return localStorage.getItem(JWT_KEY);
}

export function setStoredJwt(token: string | null): void {
  if (token) localStorage.setItem(JWT_KEY, token);
  else localStorage.removeItem(JWT_KEY);
}

export function isJwtExpired(): boolean {
  const jwt = getStoredJwt();
  if (!jwt) return true;
  try {
    // JWT uses base64url (- and _ instead of + and /) — convert before atob()
    const base64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(base64));
    // 30s buffer to avoid races near the end of validity
    return Date.now() / 1000 > payload.exp - 30;
  } catch {
    return true;
  }
}

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const res = await fetch(path, init);
  if (!res.ok) {
    let detail = '';
    try {
      detail = ' — ' + JSON.stringify(await res.json());
    } catch {
      // ignore: response body is not JSON, keep the bare status code
    }
    throw new Error(`${path} ${res.status}${detail}`);
  }
  return res.json();
}

function normalizeAddr(addr: string): string {
  return addr.replace(/\s/g, '').toUpperCase();
}

/**
 * Authenticate the connected user by signing a server-issued challenge.
 * The JWT's address is derived server-side from the signing public key, so the
 * client cannot claim an address it does not control. `expectedAddress` (the
 * wallet's primary account) is cross-checked against the derived address to
 * catch the case where the wallet signs with a different key.
 */
export async function authenticate(expectedAddress: string): Promise<void> {
  const inNimiq = await detectNimiqApp();

  if (!inNimiq) {
    // Dev browser: no wallet to sign with. The server honors this only when
    // ALLOW_DEV_AUTH is enabled (never in production).
    const { token } = (await request('/api/auth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ devAddress: expectedAddress }),
    })) as { token: string };
    setStoredJwt(token);
    return;
  }

  const lang = getHostLanguage() ?? 'en';
  const { challenge, mac } = (await request(
    `/api/auth/challenge?lang=${encodeURIComponent(lang)}`,
  )) as {
    challenge: string;
    mac: string;
  };
  const { publicKey, signature } = await signMessage(challenge);
  const { token, address } = (await request('/api/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challenge, mac, publicKey, signature }),
  })) as { token: string; address: string };

  if (normalizeAddr(address) !== normalizeAddr(expectedAddress)) {
    throw new Error('signed address does not match the connected account');
  }
  setStoredJwt(token);
}

/**
 * Extend the current session silently (no signature), using the still-valid
 * JWT. Keeps an active user logged in without re-prompting the wallet.
 */
export async function refreshToken(): Promise<void> {
  const jwt = getStoredJwt();
  if (!jwt) throw new Error('no token to refresh');
  const { token } = (await request('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
  })) as { token: string };
  setStoredJwt(token);
}
