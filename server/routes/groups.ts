import { Router } from 'express';
import sql from '../lib/db.js';
import { requireAuth, type AuthRequest } from '../lib/auth.js';

const router = Router();

router.get('/', requireAuth, async (req, res): Promise<void> => {
  const { address } = (req as AuthRequest).user;

  try {
    const rows = await sql<{
      id: string; name: string; icon: string; creator_addr: string;
      currencies: string[]; invite_token: string; created_at: Date;
      members: { id: string; address: string | null; name: string; joined_at: Date }[];
    }[]>`
      SELECT
        g.id, g.name, g.icon, g.creator_addr, g.currencies, g.invite_token, g.created_at,
        json_agg(
          json_build_object('id', m.id, 'address', m.address, 'name', m.name, 'joined_at', m.joined_at)
          ORDER BY m.joined_at
        ) AS members
      FROM groups g
      JOIN members m ON m.group_id = g.id
      WHERE g.id IN (SELECT group_id FROM members WHERE address = ${address})
      GROUP BY g.id
      ORDER BY g.created_at DESC
    `;

    res.json(rows.map((g) => ({
      id: g.id,
      name: g.name,
      icon: g.icon,
      creatorId: g.creator_addr,
      currencies: g.currencies,
      inviteToken: g.invite_token,
      createdAt: g.created_at,
      members: g.members.map((m) => ({
        id: m.id,
        address: m.address ?? undefined,
        name: m.name,
        joinedAt: m.joined_at,
      })),
    })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

router.post('/', requireAuth, async (req, res): Promise<void> => {
  const { address } = (req as AuthRequest).user;
  const body = req.body as {
    id: string; name: string; icon: string; creatorId: string;
    currencies: string[]; inviteToken?: string;
    members: { id: string; name: string }[];
  };

  if (!body.id || !body.name || !body.icon || !Array.isArray(body.members)) {
    res.status(400).json({ error: 'id, name, icon and members array required' });
    return;
  }
  if (body.creatorId !== address) {
    res.status(403).json({ error: 'creatorId must match authenticated user' });
    return;
  }

  try {
    const inviteToken = body.inviteToken
      ?? Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map((b) => b.toString(16).padStart(2, '0')).join('');

    let createdMembers: { id: string; address: string | null; name: string; joined_at: Date }[] = [];

    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO groups (id, name, icon, creator_addr, currencies, invite_token)
        VALUES (
          ${body.id}, ${body.name}, ${body.icon}, ${address},
          ${body.currencies ?? ['NIM']}, ${inviteToken}
        )
      `;
      for (const m of body.members) {
        // Le créateur est inséré avec son adresse Nimiq.
        // Les placeholders (pas encore d'adresse) ont m.address = undefined/null.
        const memberAddr = (m as any).address ?? m.id ?? null;
        const rows = await tx<{ id: string; address: string | null; name: string; joined_at: Date }[]>`
          INSERT INTO members (group_id, address, name)
          VALUES (${body.id}, ${memberAddr || null}, ${m.name})
          RETURNING id, address, name, joined_at
        `;
        createdMembers = createdMembers.concat(rows);
      }
    });

    res.status(201).json({
      members: createdMembers.map((m) => ({
        id: m.id,
        address: m.address ?? undefined,
        name: m.name,
        joinedAt: m.joined_at,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

export default router;
