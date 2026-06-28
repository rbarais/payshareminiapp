// @vitest-environment node
import { describe, it, expect, vi, beforeAll } from 'vitest';
import express from 'express';
import request from 'supertest';
import authRouter from './auth.js';

// Mock db so tests don't need a real database
vi.mock('../lib/db.js', () => ({
  default: Object.assign(async (_strings: TemplateStringsArray, ..._values: unknown[]) => [], {
    unsafe: async () => [],
  }),
}));

beforeAll(() => {
  process.env.APP_JWT_SECRET = 'test-secret-min-32-chars-padding!!';
  process.env.ALLOW_DEV_AUTH = 'true';
});

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('POST /api/auth/challenge', () => {
  it('returns 400 when address is missing', async () => {
    const res = await request(app).post('/api/auth/challenge').send({});
    expect(res.status).toBe(400);
  });

  it('returns a challenge string containing the address', async () => {
    const res = await request(app).post('/api/auth/challenge').send({ address: 'NQ TEST' });
    expect(res.status).toBe(200);
    expect(res.body.challenge).toContain('NQ TEST');
  });
});

describe('POST /api/auth/verify (dev mode)', () => {
  it('returns a JWT token in dev mode', async () => {
    const res = await request(app).post('/api/auth/verify').send({ address: 'NQ TEST', dev: true });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.token.split('.')).toHaveLength(3);
  });

  it('returns 400 when address is missing', async () => {
    const res = await request(app).post('/api/auth/verify').send({ dev: true });
    expect(res.status).toBe(400);
  });
});
