import type { Request, Response, NextFunction } from 'express';
import { verifyJwt } from './jwt.js';

export interface AuthRequest extends Request {
  user: { address: string };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'missing token' });
    return;
  }
  try {
    const { sub } = await verifyJwt(header.slice(7));
    (req as AuthRequest).user = { address: sub };
    next();
  } catch {
    res.status(401).json({ error: 'invalid token' });
  }
}
