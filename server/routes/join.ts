import { Router } from 'express';
import sql from '../lib/db.js';
import { requireAuth, type AuthRequest } from '../lib/auth.js';

const router = Router();

// GET /api/join/preview?g=<groupId>&t=<token>
// Returns the available placeholders (address IS NULL) without authentication.
router.get('/join/preview', async (req, res): Promise<void> => {
  const groupId = req.query.g as string;
  const token = req.query.t as string;

  if (!groupId || !token) {
    res.status(400).json({ error: 'g and t required' });
    return;
  }

  try {
    const groups = await sql<{ id: string }[]>`
      SELECT id FROM groups WHERE id = ${groupId} AND invite_token = ${token} LIMIT 1
    `;
    if (groups.length === 0) {
      res.status(401).json({ error: 'invalid invite' });
      return;
    }

    const placeholders = await sql<{ id: string; name: string }[]>`
      SELECT id, name FROM members
      WHERE group_id = ${groupId} AND address IS NULL
      ORDER BY joined_at
    `;

    res.json({
      placeholders: placeholders.map((member) => ({ id: member.id, name: member.name })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// POST /api/join
// Two cases:
//   1. placeholderId provided → link the address to the existing placeholder
//   2. no placeholderId → insert a new member with their address
router.post('/join', requireAuth, async (req, res): Promise<void> => {
  const { address } = (req as AuthRequest).user;
  const { groupId, token, placeholderId, name } = req.body as {
    groupId?: string;
    token?: string;
    placeholderId?: string;
    name?: string;
  };

  if (!groupId || !token) {
    res.status(400).json({ error: 'groupId and token required' });
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

    if (placeholderId) {
      // Case 1: the user claims a placeholder
      let updated: { id: string }[];
      try {
        updated = await sql<{ id: string }[]>`
          UPDATE members SET address = ${address}
          WHERE id = ${placeholderId} AND group_id = ${groupId} AND address IS NULL
          RETURNING id
        `;
      } catch {
        // Unique constraint violated: the address is already in the group
        res.status(409).json({ error: 'already a member of this group' });
        return;
      }
      if (updated.length === 0) {
        // Either the placeholder does not exist, or it is already claimed
        res.status(409).json({ error: 'placeholder not available' });
        return;
      }
    } else {
      // Case 2: new member
      if (!name?.trim()) {
        res.status(400).json({ error: 'name required' });
        return;
      }
      try {
        await sql`
          INSERT INTO members (group_id, address, name)
          VALUES (${groupId}, ${address}, ${name.trim()})
          ON CONFLICT (group_id, address) DO NOTHING
        `;
      } catch {
        res.status(409).json({ error: 'already a member of this group' });
        return;
      }
    }

    const group = groups[0];
    res.json({ name: group.name, icon: group.icon });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

export default router;
