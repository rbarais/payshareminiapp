import { Router } from 'express';
import sql from '../lib/db.js';
import { requireAuth, type AuthRequest } from '../lib/auth.js';

const router = Router();

// GET /api/join/preview?g=<groupId>&t=<token>
// Retourne les placeholders disponibles (address IS NULL) sans authentification.
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

    res.json({ placeholders: placeholders.map((m) => ({ id: m.id, name: m.name })) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

// POST /api/join
// Deux cas :
//   1. placeholderId fourni → lie l'adresse au placeholder existant
//   2. pas de placeholderId → insère un nouveau membre avec son adresse
router.post('/join', requireAuth, async (req, res): Promise<void> => {
  const { address } = (req as AuthRequest).user;
  const { groupId, token, placeholderId, name } = req.body as {
    groupId?: string; token?: string; placeholderId?: string; name?: string;
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
      // Cas 1 : l'utilisateur réclame un placeholder
      let updated: { id: string }[];
      try {
        updated = await sql<{ id: string }[]>`
          UPDATE members SET address = ${address}
          WHERE id = ${placeholderId} AND group_id = ${groupId} AND address IS NULL
          RETURNING id
        `;
      } catch {
        // Contrainte unique violée : l'adresse est déjà dans le groupe
        res.status(409).json({ error: 'already a member of this group' });
        return;
      }
      if (updated.length === 0) {
        // Soit le placeholder n'existe pas, soit il est déjà réclamé
        res.status(409).json({ error: 'placeholder not available' });
        return;
      }
    } else {
      // Cas 2 : nouveau membre
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

    const g = groups[0];
    res.json({ name: g.name, icon: g.icon });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

export default router;
