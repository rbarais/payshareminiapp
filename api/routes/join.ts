import { Router } from 'express';
import sql from '../lib/db.js';
import { requireAuth, type AuthRequest } from '../lib/auth.js';

const router = Router();

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

    await sql`
      INSERT INTO members (group_id, address, name)
      VALUES (${groupId}, ${address}, ${name})
      ON CONFLICT (group_id, address) DO NOTHING
    `;

    const g = groups[0];
    res.json({ name: g.name, icon: g.icon });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

export default router;
