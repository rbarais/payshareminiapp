import { Router } from 'express';
import sql from '../lib/db.js';
import { requireAuth, type AuthRequest } from '../lib/auth.js';

const router = Router();

// GET /api/groups/:id/members — returns all members of a group (must be a member)
router.get('/:id/members', requireAuth, async (req, res): Promise<void> => {
  const { address } = (req as AuthRequest).user;
  const groupId = req.params.id;

  try {
    const rows = await sql<{ id: string; address: string | null; name: string; joined_at: Date }[]>`
      SELECT id, address, name, joined_at FROM members
      WHERE group_id = ${groupId}
        AND group_id IN (SELECT group_id FROM members WHERE address = ${address})
      ORDER BY joined_at
    `;

    if (rows.length === 0) {
      res.status(403).json({ error: 'not a member' });
      return;
    }

    res.json(
      rows.map((member) => ({
        id: member.id,
        address: member.address ?? undefined,
        name: member.name,
        joinedAt: member.joined_at,
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// POST /api/groups/:id/members — the creator adds a placeholder member (without an address)
router.post('/:id/members', requireAuth, async (req, res): Promise<void> => {
  const { address } = (req as AuthRequest).user;
  const groupId = req.params.id;
  const { name } = req.body as { name?: string };

  if (!name?.trim()) {
    res.status(400).json({ error: 'name required' });
    return;
  }

  try {
    const group = await sql<{ id: string }[]>`
      SELECT id FROM groups WHERE id = ${groupId} AND creator_addr = ${address} LIMIT 1
    `;
    if (group.length === 0) {
      res.status(403).json({ error: 'only the creator can add members' });
      return;
    }

    const rows = await sql<{ id: string; name: string; joined_at: Date }[]>`
      INSERT INTO members (group_id, address, name)
      VALUES (${groupId}, NULL, ${name.trim()})
      RETURNING id, name, joined_at
    `;

    res.status(201).json({
      id: rows[0].id,
      address: undefined,
      name: rows[0].name,
      joinedAt: rows[0].joined_at,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

export default router;
