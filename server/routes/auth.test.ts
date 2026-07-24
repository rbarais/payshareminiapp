// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createHmac } from 'node:crypto';
import { getPublicKeyAsync, signAsync } from '@noble/ed25519';
import authRouter from './auth.js';
import { messageHash } from '../lib/nimiq.js';
import { signJwt } from '../lib/jwt.js';

const SECRET = 'test-secret-min-32-chars-padding!!';

beforeAll(() => {
  process.env.APP_JWT_SECRET = SECRET;
});

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

describe('GET /api/auth/challenge', () => {
  it('returns a challenge with a matching HMAC', async () => {
    const res = await request(app).get('/api/auth/challenge');
    expect(res.status).toBe(200);
    expect(typeof res.body.challenge).toBe('string');
    const expected = createHmac('sha256', SECRET).update(res.body.challenge).digest('hex');
    expect(res.body.mac).toBe(expected);
  });
});

describe('POST /api/auth/token', () => {
  it('returns 400 when signature fields are missing', async () => {
    const res = await request(app).post('/api/auth/token').send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 for a challenge with an invalid HMAC', async () => {
    const challenge = `Payshare login | ${'ab'.repeat(16)} | ${Date.now()}`;
    const res = await request(app)
      .post('/api/auth/token')
      .send({ challenge, mac: '0'.repeat(64), publicKey: 'aa', signature: 'bb' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid challenge');
  });

  it('returns 401 for an expired challenge', async () => {
    const challenge = `Payshare login | ${'ab'.repeat(16)} | ${Date.now() - 200_000}`;
    const mac = createHmac('sha256', SECRET).update(challenge).digest('hex');
    const res = await request(app)
      .post('/api/auth/token')
      .send({ challenge, mac, publicKey: 'aa', signature: 'bb' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('challenge expired');
  });

  it('issues a JWT for a validly signed fresh challenge', async () => {
    const priv = new Uint8Array(32).fill(3);
    const pub = await getPublicKeyAsync(priv);

    const chRes = await request(app).get('/api/auth/challenge');
    const { challenge, mac } = chRes.body as { challenge: string; mac: string };
    const signature = await signAsync(messageHash(challenge), priv);

    const res = await request(app)
      .post('/api/auth/token')
      .send({
        challenge,
        mac,
        publicKey: toHex(pub),
        signature: toHex(signature),
      });
    expect(res.status).toBe(200);
    expect(res.body.token.split('.')).toHaveLength(3);
    expect(res.body.address).toMatch(/^NQ/);
  });

  it('rejects a valid fresh challenge signed by the wrong key', async () => {
    const priv = new Uint8Array(32).fill(4);
    const chRes = await request(app).get('/api/auth/challenge');
    const { challenge, mac } = chRes.body as { challenge: string; mac: string };
    // Sign a different message so the signature does not match the challenge.
    const signature = await signAsync(messageHash('other message'), priv);
    const pub = await getPublicKeyAsync(priv);

    const res = await request(app)
      .post('/api/auth/token')
      .send({
        challenge,
        mac,
        publicKey: toHex(pub),
        signature: toHex(signature),
      });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('invalid signature');
  });

  it('honors the dev bypass only when ALLOW_DEV_AUTH is set', async () => {
    process.env.ALLOW_DEV_AUTH = 'true';
    try {
      const res = await request(app).post('/api/auth/token').send({ devAddress: 'NQ TEST' });
      expect(res.status).toBe(200);
      expect(res.body.token.split('.')).toHaveLength(3);
    } finally {
      delete process.env.ALLOW_DEV_AUTH;
    }
  });
});

describe('POST /api/auth/refresh', () => {
  it('returns 401 without a token', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  it('issues a fresh JWT for a valid token', async () => {
    const jwt = await signJwt('NQ62 Q7S4 Y8QN 85HQ XJPG R48B JBQ8 SH0A J2VD');
    const res = await request(app).post('/api/auth/refresh').set('Authorization', `Bearer ${jwt}`);
    expect(res.status).toBe(200);
    expect(res.body.token.split('.')).toHaveLength(3);
    expect(res.body.address).toBe('NQ62 Q7S4 Y8QN 85HQ XJPG R48B JBQ8 SH0A J2VD');
  });
});
