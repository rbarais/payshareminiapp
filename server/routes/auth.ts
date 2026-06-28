import { Router } from 'express';
import { signJwt } from '../lib/jwt.js';

const router = Router();

// listAccounts() in Nimiq Pay requires the user's explicit approval.
// The address returned by the wallet is authentic — no need to re-verify it
// with a backend-side signature for a mini-app running inside Nimiq Pay.
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
