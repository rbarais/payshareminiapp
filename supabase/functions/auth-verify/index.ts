import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { create, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts';
import { verifyNimiqSignature } from '../_shared/nimiq-verify.ts';

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify'],
  );
}

export async function mintJwt(address: string, secret: string): Promise<string> {
  return create(
    { alg: 'HS256', typ: 'JWT' },
    { sub: address, role: 'authenticated', exp: getNumericDate(7 * 24 * 60 * 60) },
    await key(secret),
  );
}

Deno.serve(async (req) => {
  const body = await req.json();
  const { address, publicKey, signature } = body;

  // Mode dev local uniquement : mint sans signature. ALLOW_DEV_AUTH n'est
  // jamais défini en prod.
  if (body.dev === true && Deno.env.get('ALLOW_DEV_AUTH') === 'true') {
    const token = await mintJwt(body.address, Deno.env.get('APP_JWT_SECRET')!);
    return Response.json({ token });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  // nonce valide et non consommé
  const { data: row } = await admin.from('auth_challenges')
    .select('nonce, expires_at, used').eq('address', address).eq('used', false)
    .order('expires_at', { ascending: false }).limit(1).maybeSingle();
  if (!row || new Date(row.expires_at) < new Date()) return new Response('no challenge', { status: 401 });

  const challenge = `PayShare login\naddr: ${address}\nnonce: ${row.nonce}`;
  try {
    const derived = await verifyNimiqSignature(challenge, publicKey, signature);
    if (derived.replace(/\s/g, '') !== address.replace(/\s/g, '')) throw new Error('addr mismatch');
  } catch {
    return new Response('invalid signature', { status: 401 });
  }

  await admin.from('auth_challenges').update({ used: true }).eq('address', address).eq('nonce', row.nonce);
  const token = await mintJwt(address, Deno.env.get('APP_JWT_SECRET')!);
  return Response.json({ token });
});
