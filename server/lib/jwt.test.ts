// @vitest-environment node
import { describe, it, expect, beforeAll } from 'vitest';
import { signJwt, verifyJwt } from './jwt.js';

beforeAll(() => {
  process.env.APP_JWT_SECRET = 'test-secret-min-32-chars-padding!!';
});

describe('signJwt', () => {
  it('returns a three-part JWT string', async () => {
    const token = await signJwt('NQ TEST ADDRESS');
    expect(token.split('.')).toHaveLength(3);
  });
});

describe('verifyJwt', () => {
  it('returns the address as sub', async () => {
    const token = await signJwt('NQ TEST ADDRESS');
    const { sub } = await verifyJwt(token);
    expect(sub).toBe('NQ TEST ADDRESS');
  });

  it('throws on a tampered token', async () => {
    const token = await signJwt('NQ TEST ADDRESS');
    const [h, p, s] = token.split('.');
    await expect(verifyJwt(`${h}.${p}.INVALIDSIG`)).rejects.toThrow();
  });

  it('throws on a completely invalid string', async () => {
    await expect(verifyJwt('not.a.jwt')).rejects.toThrow();
  });
});
