import { signMessage, detectNimiqApp } from './nimiq';

const JWT_KEY = 'payshare_jwt';

export function getStoredJwt(): string | null {
  return localStorage.getItem(JWT_KEY);
}

export function setStoredJwt(token: string | null): void {
  if (token) localStorage.setItem(JWT_KEY, token);
  else localStorage.removeItem(JWT_KEY);
}

async function post(path: string, body: unknown): Promise<any> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}

export async function authenticate(address: string): Promise<void> {
  const inNimiq = await detectNimiqApp();
  if (!inNimiq) {
    const { token } = await post('/api/auth/verify', { address, dev: true });
    setStoredJwt(token);
    return;
  }
  const { challenge } = await post('/api/auth/challenge', { address });
  const { publicKey, signature } = await signMessage(challenge);
  const { token } = await post('/api/auth/verify', { address, publicKey, signature });
  setStoredJwt(token);
}
