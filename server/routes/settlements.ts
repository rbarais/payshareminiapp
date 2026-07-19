import { Router } from 'express';
import sql from '../lib/db.js';
import { requireAuth, type AuthRequest } from '../lib/auth.js';

const router = Router();

function normalizeAddr(addr: string): string {
  return addr.replace(/\s/g, '').toUpperCase();
}

type AllocationInput = {
  expenseId: string;
  amount: number;
};

function parseAllocations(raw: unknown): AllocationInput[] | null {
  if (raw == null) return [];
  if (!Array.isArray(raw)) return null;
  const valid = raw.every(
    (entry): entry is AllocationInput =>
      typeof entry === 'object' &&
      entry !== null &&
      typeof (entry as AllocationInput).expenseId === 'string' &&
      typeof (entry as AllocationInput).amount === 'number' &&
      (entry as AllocationInput).amount > 0,
  );
  return valid ? (raw as AllocationInput[]) : null;
}

router.get('/settlements', requireAuth, async (req, res): Promise<void> => {
  const { address } = (req as AuthRequest).user;

  try {
    const rows = await sql<
      {
        id: string;
        group_id: string;
        from_addr: string;
        to_addr: string;
        amount: string;
        currency: string;
        tx_hash: string | null;
        allocations: { expenseId: string; amount: number }[] | null;
        verified_at: Date | null;
        created_at: Date;
      }[]
    >`
      SELECT id, group_id, from_addr, to_addr, amount, currency, tx_hash, allocations, verified_at, created_at
      FROM payments
      WHERE group_id IN (SELECT group_id FROM members WHERE address = ${address})
      ORDER BY created_at DESC
    `;

    res.json(
      rows.map((row) => ({
        id: row.tx_hash ?? row.id,
        groupId: row.group_id,
        fromId: row.from_addr,
        toId: row.to_addr,
        amount: Number(row.amount),
        currency: row.currency,
        allocations: row.allocations ?? [],
        settledAt: row.verified_at ?? row.created_at,
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.get('/:id/settlements', requireAuth, async (req, res): Promise<void> => {
  const { address } = (req as AuthRequest).user;
  const groupId = req.params.id;

  try {
    const member = await sql`
      SELECT 1 FROM members WHERE group_id = ${groupId} AND address = ${address} LIMIT 1
    `;
    if (member.length === 0) {
      res.status(403).json({ error: 'not a member' });
      return;
    }

    const rows = await sql<
      {
        id: string;
        group_id: string;
        from_addr: string;
        to_addr: string;
        amount: string;
        currency: string;
        tx_hash: string | null;
        allocations: { expenseId: string; amount: number }[] | null;
        verified_at: Date | null;
        created_at: Date;
      }[]
    >`
      SELECT id, group_id, from_addr, to_addr, amount, currency, tx_hash, allocations, verified_at, created_at
      FROM payments
      WHERE group_id = ${groupId}
      ORDER BY created_at DESC
    `;

    res.json(
      rows.map((row) => ({
        id: row.tx_hash ?? row.id,
        groupId: row.group_id,
        fromId: row.from_addr,
        toId: row.to_addr,
        amount: Number(row.amount),
        currency: row.currency,
        allocations: row.allocations ?? [],
        settledAt: row.verified_at ?? row.created_at,
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.post('/:id/settlements', requireAuth, async (req, res): Promise<void> => {
  const { address } = (req as AuthRequest).user;
  const groupId = String(req.params.id);

  try {
    const member = await sql`
      SELECT 1 FROM members WHERE group_id = ${groupId} AND address = ${address} LIMIT 1
    `;
    if (member.length === 0) {
      res.status(403).json({ error: 'not a member' });
      return;
    }

    const body = req.body as {
      fromId: string;
      toId: string;
      amount: number;
      currency: string;
      txHash: string;
      settledAt?: string;
      allocations?: unknown;
    };

    if (!body.fromId || !body.toId || body.amount == null || !body.currency || !body.txHash) {
      res.status(400).json({ error: 'missing required fields' });
      return;
    }
    if (normalizeAddr(body.fromId) !== normalizeAddr(address)) {
      res.status(403).json({ error: 'fromId must match authenticated user' });
      return;
    }

    const allocations = parseAllocations(body.allocations);
    if (allocations === null) {
      res.status(400).json({ error: 'malformed allocations' });
      return;
    }

    // Idempotent by tx_hash
    const existing = await sql`
      SELECT 1 FROM payments WHERE group_id = ${groupId} AND tx_hash = ${body.txHash} LIMIT 1
    `;
    if (existing.length > 0) {
      res.status(200).end();
      return;
    }

    // The settlement is only recorded after the Nimiq Pay payment succeeded on
    // the client, and fromId is pinned to the authenticated user above. We trust
    // that claim and record directly; verified_at stays null (reserved for a
    // future async on-chain reconciliation job).
    await sql`
      INSERT INTO payments (group_id, from_addr, to_addr, amount, currency, tx_hash, allocations)
      VALUES (
        ${groupId}, ${body.fromId}, ${body.toId}, ${body.amount},
        ${body.currency}, ${body.txHash}, ${sql.json(allocations)}
      )
    `;

    res.status(201).json({ recorded: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

export default router;
