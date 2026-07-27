// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Queue-based db mock: each sql`...` call pops the next prepared result.
// An Error in the queue is thrown, to simulate a database failure.
const results: (unknown[] | Error)[] = [];
const queries: string[] = [];
vi.mock('../lib/db.js', () => {
  const sqlMock = Object.assign(
    async (strings: TemplateStringsArray, ..._values: unknown[]) => {
      queries.push(strings.join('?'));
      const next = results.shift();
      if (next instanceof Error) throw next;
      return next ?? [];
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

import joinRouter from './join.js';

const app = express();
app.use(express.json());
app.use('/api', joinRouter);

const group = { id: 'g1', name: 'Rome', icon: 'person' };

beforeEach(() => {
  results.length = 0;
  queries.length = 0;
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('POST /api/join — new member', () => {
  it('inserts the member without a conflict target', async () => {
    results.push([group]); // invite lookup
    results.push([]); // insert
    const res = await request(app)
      .post('/api/join')
      .send({ groupId: 'g1', token: 'tok', name: 'Léa' });

    expect(res.status).toBe(200);
    const insert = queries.find((query) => query.includes('INSERT INTO members'));
    // A targeted ON CONFLICT (group_id, address) cannot be inferred: the unique
    // index is partial (WHERE address IS NOT NULL), so Postgres raises 42P10.
    expect(insert).toBeDefined();
    expect(insert).not.toMatch(/ON CONFLICT\s*\(/i);
  });

  it('reports a database failure as 500, not as "already a member"', async () => {
    results.push([group]);
    results.push(new Error('there is no unique or exclusion constraint matching'));
    const res = await request(app)
      .post('/api/join')
      .send({ groupId: 'g1', token: 'tok', name: 'Léa' });

    expect(res.status).toBe(500);
  });
});

describe('POST /api/join — claiming a placeholder', () => {
  it('returns 409 when the address is already a member of the group', async () => {
    results.push([group]);
    results.push(Object.assign(new Error('duplicate key value'), { code: '23505' }));
    const res = await request(app)
      .post('/api/join')
      .send({ groupId: 'g1', token: 'tok', placeholderId: 'm1' });

    expect(res.status).toBe(409);
  });

  it('reports any other database failure as 500', async () => {
    results.push([group]);
    results.push(new Error('connection terminated'));
    const res = await request(app)
      .post('/api/join')
      .send({ groupId: 'g1', token: 'tok', placeholderId: 'm1' });

    expect(res.status).toBe(500);
  });

  it('returns 409 when the placeholder is already claimed', async () => {
    results.push([group]);
    results.push([]); // UPDATE ... RETURNING id → no row
    const res = await request(app)
      .post('/api/join')
      .send({ groupId: 'g1', token: 'tok', placeholderId: 'm1' });

    expect(res.status).toBe(409);
  });
});
