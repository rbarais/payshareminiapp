import { Router } from 'express';
import sql from '../lib/db.js';
import { requireAuth, type AuthRequest } from '../lib/auth.js';

const router = Router();

router.get('/:id/expenses', requireAuth, async (req, res): Promise<void> => {
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
        description: string;
        amount: string;
        currency: string;
        paid_by: string;
        split: string;
        shares: unknown[];
        created_at: Date;
      }[]
    >`
      SELECT id, group_id, description, amount, currency, paid_by, split, shares, created_at
      FROM expenses
      WHERE group_id = ${groupId}
      ORDER BY created_at DESC
    `;

    res.json(
      rows.map((row) => ({
        id: row.id,
        groupId: row.group_id,
        description: row.description,
        amount: Number(row.amount),
        currency: row.currency,
        paidBy: row.paid_by,
        split: row.split,
        shares: row.shares ?? [],
        createdAt: row.created_at,
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.post('/:id/expenses', requireAuth, async (req, res): Promise<void> => {
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

    const expense = req.body as {
      id: string;
      description: string;
      amount: number;
      currency: string;
      paidBy: string;
      split: string;
      shares: { memberId: string; weight: number; amount: number }[];
    };

    if (
      !expense.id ||
      !expense.description ||
      expense.amount == null ||
      !expense.currency ||
      !expense.paidBy ||
      !expense.split
    ) {
      res.status(400).json({ error: 'missing required fields' });
      return;
    }

    await sql`
      INSERT INTO expenses (id, group_id, description, amount, currency, paid_by, split, shares)
      VALUES (
        ${expense.id}, ${groupId}, ${expense.description}, ${expense.amount},
        ${expense.currency}, ${expense.paidBy}, ${expense.split}, ${sql.json(expense.shares ?? [])}
      )
    `;

    res.status(201).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

export default router;
