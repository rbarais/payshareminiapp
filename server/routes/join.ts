import { Router } from 'express';
import sql from '../lib/db.js';
import { requireAuth, type AuthRequest } from '../lib/auth.js';

const router = Router();

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

router.post('/join', requireAuth, async (req, res): Promise<void> => {
  const { address } = (req as AuthRequest).user;
  const { groupId, token, name } = req.body as {
    groupId?: string; token?: string; name?: string;
  };

  if (!groupId || !token || !name) {
    res.status(400).json({ error: 'groupId, token and name required' });
    return;
  }

  try {
    const groups = await sql<{ id: string; name: string; icon: string }[]>`
      SELECT id, name, icon FROM groups
      WHERE id = ${groupId} AND invite_token = ${token}
    `;

    if (groups.length === 0) {
      res.status(401).json({ error: 'invalid invite' });
      return;
    }

    // RETURNING indique si la ligne a réellement été insérée (vs conflit ignoré).
    const inserted = await sql<{ address: string }[]>`
      INSERT INTO members (group_id, address, name)
      VALUES (${groupId}, ${address}, ${name})
      ON CONFLICT (group_id, address) DO NOTHING
      RETURNING address
    `;

    // Si le membre est nouveau, on le redistribue dans les dépenses existantes
    // en "equal" split pour qu'il ait une part calculée dès son arrivée.
    if (inserted.length > 0) {
      const expenses = await sql<{
        id: string; amount: string; shares: { memberId: string; weight: number; amount: number }[];
      }[]>`
        SELECT id, amount, shares FROM expenses
        WHERE group_id = ${groupId} AND split = 'equal'
      `;

      for (const exp of expenses) {
        const existing = exp.shares as { memberId: string; weight: number; amount: number }[];
        // Idempotent : ne pas ajouter deux fois la même adresse.
        if (existing.some((s) => s.memberId === address)) continue;

        const total = Number(exp.amount);
        const n = existing.length + 1;
        const each = round2(total / n);

        const newShares = existing.map((s) => ({ ...s, amount: each }));
        newShares.push({ memberId: address, weight: 0, amount: each });

        // Réinjecte l'arrondi résiduel sur la dernière part.
        const diff = round2(total - each * n);
        if (diff !== 0) newShares[newShares.length - 1].amount = round2(newShares[newShares.length - 1].amount + diff);

        await sql`
          UPDATE expenses SET shares = ${sql.json(newShares)} WHERE id = ${exp.id}
        `;
      }
    }

    const g = groups[0];
    res.json({ name: g.name, icon: g.icon });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

export default router;
