import { signMessage, detectNimiqApp } from './nimiq';
import { setStoredJwt } from './supabase';

const FN = `${import.meta.env.VITE_PUBLIC_SUPABASE_URL}/functions/v1`;
const ANON = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY;

async function post(path: string, body: unknown): Promise<any> {
  const res = await fetch(`${FN}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: ANON, Authorization: `Bearer ${ANON}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}

export async function authenticate(address: string): Promise<void> {
  const inNimiq = await detectNimiqApp();
  if (!inNimiq) {
    // Mode dev : JWT sans signature (l'Edge Function reconnaît l'absence de provider).
    const { token } = await post('auth-verify', { address, dev: true });
    setStoredJwt(token);
    return;
  }
  const { challenge } = await post('auth-challenge', { address });
  const { publicKey, signature } = await signMessage(challenge);
  const { token } = await post('auth-verify', { address, publicKey, signature });
  setStoredJwt(token);
}
