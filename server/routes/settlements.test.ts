// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Queue-based db mock: each sql`...` call pops the next prepared result.
const results: unknown[][] = [];
const calls: { values: unknown[] }[] = [];
vi.mock('../lib/db.js', () => {
  const sqlMock = Object.assign(
    async (_strings: TemplateStringsArray, ...values: unknown[]) => {
      calls.push({ values });
      return results.shift() ?? [];
    },
    { json: (value: unknown) => value, unsafe: async () => [] },
  );
  return { default: sqlMock };
});

vi.mock('../lib/auth.js', () => ({
  requireAuth: (req: { user?: unknown }, _res: unknown, next: () => void) => {
    req.user = { address: 'NQ01 TEST' };
    next();
  },
}));

import settlementsRouter from './settlements.js';

const app = express();
app.use(express.json());
app.use('/api/groups', settlementsRouter);

beforeEach(() => {
  results.length = 0;
  calls.length = 0;
});

describe('POST /api/groups/:id/settlements with allocations', () => {
  const base = {
    fromId: 'NQ01 TEST',
    toId: 'NQ02 OTHER',
    amount: 9,
    currency: 'NIM',
    txHash: 'abc123',
  };

  it('records a settlement carrying allocations', async () => {
    results.push([{ ok: 1 }]); // member check
    results.push([]); // idempotency check
    results.push([]); // insert
    const res = await request(app)
      .post('/api/groups/g1/settlements')
      .send({
        ...base,
        allocations: [
          { expenseId: 'e1', amount: 5 },
          { expenseId: 'e2', amount: 4 },
        ],
      });
    expect(res.status).toBe(201);
    // The insert (3rd query) received the allocations payload.
    expect(calls[2].values).toContainEqual([
      { expenseId: 'e1', amount: 5 },
      { expenseId: 'e2', amount: 4 },
    ]);
  });

  it('defaults to empty allocations when the field is absent', async () => {
    results.push([{ ok: 1 }]);
    results.push([]);
    results.push([]);
    const res = await request(app).post('/api/groups/g1/settlements').send(base);
    expect(res.status).toBe(201);
    expect(calls[2].values).toContainEqual([]);
  });

  it('rejects malformed allocations', async () => {
    results.push([{ ok: 1 }]);
    const res = await request(app)
      .post('/api/groups/g1/settlements')
      .send({ ...base, allocations: [{ expenseId: 42, amount: 'x' }] });
    expect(res.status).toBe(400);
  });
});
