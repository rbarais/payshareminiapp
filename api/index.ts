import express from 'express';
import authRouter from '../server/routes/auth.js';
import groupsRouter from '../server/routes/groups.js';
import expensesRouter from '../server/routes/expenses.js';
import settlementsRouter from '../server/routes/settlements.js';
import joinRouter from '../server/routes/join.js';
import membersRouter from '../server/routes/members.js';

const app = express();
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/groups', expensesRouter);
app.use('/api/groups', settlementsRouter);
app.use('/api/groups', membersRouter);
app.use('/api', joinRouter);

// The route is public and unauthenticated: schema and env details are exposed
// only when HEALTH_DEBUG is explicitly set, which must never be the case in
// production.
app.get('/api/health', async (_req, res) => {
  const debug = process.env.HEALTH_DEBUG === '1';
  const env = () => ({
    DATABASE_URL: !!process.env.DATABASE_URL,
    APP_JWT_SECRET: !!process.env.APP_JWT_SECRET,
    ALLOW_DEV_AUTH: process.env.ALLOW_DEV_AUTH ?? 'unset',
  });
  try {
    const { default: sql } = await import('../server/lib/db.js');
    await sql`SELECT 1`;
    if (!debug) {
      res.json({ ok: true });
      return;
    }
    const tables = await sql<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    res.json({
      ok: true,
      env: env(),
      db: 'connected',
      tables: tables.map((table) => table.tablename),
    });
  } catch (err) {
    if (!debug) {
      res.status(500).json({ ok: false });
      return;
    }
    res.status(500).json({ ok: false, env: env(), db: 'error', error: String(err) });
  }
});

export default app;
