import { Router } from 'express';
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { signJwt } from '../lib/jwt.js';
import { verifyNimiqSignature } from '../lib/nimiq.js';
import { requireAuth, type AuthRequest } from '../lib/auth.js';

const router = Router();

const CHALLENGE_TTL_MS = 120_000;

// The challenge is what the wallet shows the user in its signing dialog, so it
// is a plain human-readable message localized to the user's language. The nonce
// and timestamp are appended (the timestamp is always the last whitespace token,
// which the freshness check parses back out). de/es wording pending review.
const CHALLENGE_MESSAGES: Record<string, (nonce: string, ts: number) => string> = {
  fr: (nonce, ts) =>
    `Connexion à Payshare\n\nConfirmez que c'est bien vous. Ce n'est pas un paiement, aucun frais.\n\nCode : ${nonce} ${ts}`,
  en: (nonce, ts) =>
    `Sign in to Payshare\n\nConfirm it's really you. This is not a payment, no fees.\n\nCode: ${nonce} ${ts}`,
  de: (nonce, ts) =>
    `Bei Payshare anmelden\n\nBestätige, dass du es bist. Keine Zahlung, keine Gebühren.\n\nCode: ${nonce} ${ts}`,
  es: (nonce, ts) =>
    `Iniciar sesión en Payshare\n\nConfirma que eres tú. No es un pago, sin comisiones.\n\nCódigo: ${nonce} ${ts}`,
};

function challengeSecret(): string {
  const secret = process.env.APP_JWT_SECRET;
  if (!secret) throw new Error('APP_JWT_SECRET environment variable is not set');
  return secret;
}

function macFor(challenge: string): string {
  return createHmac('sha256', challengeSecret()).update(challenge).digest('hex');
}

function macValid(challenge: string, mac: string): boolean {
  const expected = macFor(challenge);
  if (mac.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(mac, 'hex'), Buffer.from(expected, 'hex'));
}

// GET /api/auth/challenge — issue a short-lived, tamper-proof nonce to sign.
// The HMAC lets us validate the challenge (freshness + integrity) statelessly,
// so no nonce storage is required.
router.get('/challenge', (req, res): void => {
  const issuedAt = Date.now();
  const nonce = randomBytes(16).toString('hex');
  const lang = typeof req.query.lang === 'string' ? req.query.lang.slice(0, 2).toLowerCase() : 'en';
  const build = CHALLENGE_MESSAGES[lang] ?? CHALLENGE_MESSAGES.en;
  const challenge = build(nonce, issuedAt);
  res.json({ challenge, mac: macFor(challenge) });
});

// POST /api/auth/token — verify a signed challenge and issue a JWT.
// The address is derived from the public key that produced the signature; the
// client never supplies it, so a caller cannot mint a token for someone else.
router.post('/token', async (req, res): Promise<void> => {
  const body = req.body as {
    challenge?: string;
    mac?: string;
    publicKey?: string;
    signature?: string;
    devAddress?: string;
  };

  // Dev-only bypass: mint a token for a raw address WITHOUT any signature.
  // Guarded by ALLOW_DEV_AUTH so it can never be reached in production — this
  // flag must never be set in a deployed environment.
  if (process.env.ALLOW_DEV_AUTH === 'true' && body.devAddress?.trim()) {
    const address = body.devAddress.trim();
    const token = await signJwt(address);
    res.json({ token, address });
    return;
  }

  const { challenge, mac, publicKey, signature } = body;
  if (!challenge || !mac || !publicKey || !signature) {
    res.status(400).json({ error: 'challenge, mac, publicKey and signature required' });
    return;
  }

  if (!macValid(challenge, mac)) {
    res.status(401).json({ error: 'invalid challenge' });
    return;
  }

  // The HMAC passed, so the challenge is exactly what we issued — its trailing
  // timestamp (always the last whitespace token) is authentic and safe to trust
  // for the freshness check.
  const issuedAt = Number(challenge.trim().split(/\s+/).pop());
  if (!Number.isFinite(issuedAt) || Date.now() - issuedAt > CHALLENGE_TTL_MS) {
    res.status(401).json({ error: 'challenge expired' });
    return;
  }

  try {
    const address = await verifyNimiqSignature(challenge, publicKey, signature);
    const token = await signJwt(address);
    res.json({ token, address });
  } catch {
    res.status(401).json({ error: 'invalid signature' });
  }
});

// POST /api/auth/refresh — roll a still-valid session forward without a new
// signature. requireAuth rejects an expired/invalid token, so this only extends
// a session the user already proved ownership of via /token.
router.post('/refresh', requireAuth, async (req, res): Promise<void> => {
  const { address } = (req as AuthRequest).user;
  const token = await signJwt(address);
  res.json({ token, address });
});

export default router;
