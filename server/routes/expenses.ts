import { Router } from 'express';
import sql from '../lib/db.js';
import { requireAuth, type AuthRequest } from '../lib/auth.js';

const router = Router();

type ExpenseRow = {
  id: string;
  group_id: string;
  description: string;
  amount: string;
  currency: string;
  paid_by: string;
  split: string;
  shares: unknown[];
  created_at: Date;
  created_by: string | null;
};

function serializeExpense(row: ExpenseRow) {
  return {
    id: row.id,
    groupId: row.group_id,
    description: row.description,
    amount: Number(row.amount),
    currency: row.currency,
    paidBy: row.paid_by,
    split: row.split,
    shares: row.shares ?? [],
    createdAt: row.created_at,
    createdBy: row.created_by ?? undefined,
  };
}

router.get('/expenses', requireAuth, async (req, res): Promise<void> => {
  const { address } = (req as AuthRequest).user;

  try {
    const rows = await sql<ExpenseRow[]>`
      SELECT id, group_id, description, amount, currency, paid_by, split, shares, created_at, created_by
      FROM expenses
      WHERE group_id IN (SELECT group_id FROM members WHERE address = ${address})
      ORDER BY created_at DESC
    `;

    res.json(rows.map(serializeExpense));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

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

    const rows = await sql<ExpenseRow[]>`
      SELECT id, group_id, description, amount, currency, paid_by, split, shares, created_at, created_by
      FROM expenses
      WHERE group_id = ${groupId}
      ORDER BY created_at DESC
    `;

    res.json(rows.map(serializeExpense));
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
      INSERT INTO expenses (id, group_id, description, amount, currency, paid_by, split, shares, created_by)
      VALUES (
        ${expense.id}, ${groupId}, ${expense.description}, ${expense.amount},
        ${expense.currency}, ${expense.paidBy}, ${expense.split}, ${sql.json(expense.shares ?? [])},
        ${address}
      )
    `;

    res.status(201).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// PATCH /api/groups/:id/expenses/:expenseId — only the author of the expense
// may edit it (created_by, set at insert time from the authenticated address).
router.patch('/:id/expenses/:expenseId', requireAuth, async (req, res): Promise<void> => {
  const { address } = (req as AuthRequest).user;
  const { id: groupId, expenseId } = req.params;
  const { description } = req.body as { description?: string };

  if (!description?.trim()) {
    res.status(400).json({ error: 'description required' });
    return;
  }

  try {
    const rows = await sql<{ id: string }[]>`
      UPDATE expenses
      SET description = ${description.trim()}
      WHERE id = ${expenseId} AND group_id = ${groupId} AND created_by = ${address}
      RETURNING id
    `;
    if (rows.length === 0) {
      res.status(403).json({ error: 'only the author can edit this expense' });
      return;
    }

    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

export default router;
