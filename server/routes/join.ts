import { Router } from 'express';
import sql from '../lib/db.js';
import { requireAuth, type AuthRequest } from '../lib/auth.js';

const router = Router();

// GET /api/join/preview?g=<groupId>&t=<token>
// Returns the group identity and the available placeholders (address IS NULL)
// without authentication.
router.get('/join/preview', async (req, res): Promise<void> => {
  const groupId = req.query.g as string;
  const token = req.query.t as string;

  if (!groupId || !token) {
    res.status(400).json({ error: 'g and t required' });
    return;
  }

  try {
    const groups = await sql<{ id: string; name: string; icon: string }[]>`
      SELECT id, name, icon FROM groups WHERE id = ${groupId} AND invite_token = ${token} LIMIT 1
    `;
    if (groups.length === 0) {
      res.status(401).json({ error: 'invalid invite' });
      return;
    }

    const members = await sql<{ id: string; name: string; address: string | null }[]>`
      SELECT id, name, address FROM members
      WHERE group_id = ${groupId}
      ORDER BY joined_at
    `;

    const group = groups[0];
    res.json({
      name: group.name,
      icon: group.icon,
      memberCount: members.length,
      placeholders: members
        .filter((member) => member.address === null)
        .map((member) => ({ id: member.id, name: member.name })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// POST /api/join
// Joining means claiming a placeholder the group creator pre-added, which links
// the address to it. There is no self-service way into a group.
router.post('/join', requireAuth, async (req, res): Promise<void> => {
  const { address } = (req as AuthRequest).user;
  const { groupId, token, placeholderId } = req.body as {
    groupId?: string;
    token?: string;
    placeholderId?: string;
  };

  if (!groupId || !token) {
    res.status(400).json({ error: 'groupId and token required' });
    return;
  }
  if (!placeholderId) {
    res.status(400).json({ error: 'placeholderId required' });
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

    let updated: { id: string }[];
    try {
      updated = await sql<{ id: string }[]>`
        UPDATE members SET address = ${address}
        WHERE id = ${placeholderId} AND group_id = ${groupId} AND address IS NULL
        RETURNING id
      `;
    } catch (err) {
      // 23505 = unique violation: the address is already in the group.
      // Anything else is a real failure and must not be masked as a 409.
      if ((err as { code?: string }).code !== '23505') throw err;
      res.status(409).json({ error: 'already a member of this group' });
      return;
    }
    if (updated.length === 0) {
      // Either the placeholder does not exist, or it is already claimed
      res.status(409).json({ error: 'placeholder not available' });
      return;
    }

    const group = groups[0];
    res.json({ name: group.name, icon: group.icon });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

export default router;
