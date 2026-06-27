
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
  if (!res.ok) {
    let detail = '';
    try { detail = ' — ' + JSON.stringify(await res.json()); } catch {}
    throw new Error(`${path} ${res.status}${detail}`);
  }
  return res.json();
}

export async function authenticate(address: string): Promise<void> {
  const { token } = await post('/api/auth/token', { address });
  setStoredJwt(token);
}
