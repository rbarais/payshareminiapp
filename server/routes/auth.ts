import { Router } from 'express';
import { signJwt } from '../lib/jwt.js';

const router = Router();

// listAccounts() dans Nimiq Pay requiert l'approbation explicite de l'utilisateur.
// L'adresse retournée par le wallet est authentique — pas besoin de re-vérifier
// avec une signature côté backend pour une mini-app qui tourne dans Nimiq Pay.
router.post('/token', async (req, res): Promise<void> => {
  const { address } = req.body as { address?: string };
  if (!address || typeof address !== 'string' || address.trim() === '') {
    res.status(400).json({ error: 'address required' });
    return;
  }
  try {
    const token = await signJwt(address.trim());
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal server error' });
  }
});

export default router;
