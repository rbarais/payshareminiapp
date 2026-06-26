import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export function buildChallenge(address: string): { challenge: string; nonce: string } {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const nonce = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  const challenge = `PayShare login\naddr: ${address}\nnonce: ${nonce}`;
  return { challenge, nonce };
}

Deno.serve(async (req) => {
  const { address } = await req.json();
  if (!address) return new Response('address required', { status: 400 });

  const { challenge, nonce } = buildChallenge(address);
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const expires_at = new Date(Date.now() + 5 * 60_000).toISOString();
  await admin.from('auth_challenges').insert({ address, nonce, expires_at, used: false });

  return Response.json({ challenge });
});
