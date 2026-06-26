import { createClient } from '@supabase/supabase-js';

const JWT_KEY = 'payshare_jwt';

export function getStoredJwt(): string | null {
  return localStorage.getItem(JWT_KEY);
}
export function setStoredJwt(token: string | null): void {
  if (token) localStorage.setItem(JWT_KEY, token);
  else localStorage.removeItem(JWT_KEY);
}

// Guard against missing env vars at build time (avoids module-level crash → blank page).
const _url = import.meta.env.VITE_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const _key = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_PUBLIC_SUPABASE_URL && import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY,
);

export const supabase = createClient(_url, _key, {
  accessToken: async () => getStoredJwt() ?? '',
});
