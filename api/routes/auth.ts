import { Router } from 'express';
import sql from '../lib/db.js';
import { signJwt } from '../lib/jwt.js';
import { verifyNimiqSignature } from '../lib/nimiq.js';

const router = Router();

function buildChallenge(address: string): { challenge: string; nonce: string } {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const nonce = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  const challenge = `PayShare login\naddr: ${address}\nnonce: ${nonce}`;
  return { challenge, nonce };
}

router.post('/challenge', async (req, res): Promise<void> => {
  const { address } = req.body as { address?: string };
  if (!address) { res.status(400).json({ error: 'address required' }); return; }

  const { challenge, nonce } = buildChallenge(address);
  const expiresAt = new Date(Date.now() + 5 * 60_000);

  await sql`
    INSERT INTO auth_challenges (address, nonce, expires_at, used)
    VALUES (${address}, ${nonce}, ${expiresAt}, false)
  `;

  res.json({ challenge });
});

router.post('/verify', async (req, res): Promise<void> => {
  const body = req.body as {
    address?: string;
    publicKey?: string;
    signature?: string;
    dev?: boolean;
  };
  const { address, publicKey, signature } = body;

  if (!address) { res.status(400).json({ error: 'address required' }); return; }

  if (body.dev === true && process.env.ALLOW_DEV_AUTH === 'true') {
    const token = await signJwt(address);
    res.json({ token });
    return;
  }

  if (!publicKey || !signature) {
    res.status(400).json({ error: 'publicKey and signature required' });
    return;
  }

  const rows = await sql<{ nonce: string; expires_at: Date; used: boolean }[]>`
    SELECT nonce, expires_at, used FROM auth_challenges
    WHERE address = ${address} AND used = false
    ORDER BY expires_at DESC
    LIMIT 1
  `;

  const row = rows[0];
  if (!row || row.expires_at < new Date()) {
    res.status(401).json({ error: 'no valid challenge' });
    return;
  }

  const challenge = `PayShare login\naddr: ${address}\nnonce: ${row.nonce}`;
  try {
    const derived = await verifyNimiqSignature(challenge, publicKey, signature);
    if (derived.replace(/\s/g, '') !== address.replace(/\s/g, '')) {
      throw new Error('address mismatch');
    }
  } catch {
    res.status(401).json({ error: 'invalid signature' });
    return;
  }

  await sql`
    UPDATE auth_challenges SET used = true
    WHERE address = ${address} AND nonce = ${row.nonce}
  `;

  const token = await signJwt(address);
  res.json({ token });
});

export default router;
