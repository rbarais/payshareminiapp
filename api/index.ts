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

app.get('/api/health', async (_req, res) => {
  const env = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    APP_JWT_SECRET: !!process.env.APP_JWT_SECRET,
    ALLOW_DEV_AUTH: process.env.ALLOW_DEV_AUTH ?? 'unset',
  };
  try {
    const { default: sql } = await import('../server/lib/db.js');
    await sql`SELECT 1`;
    const tables = await sql<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    res.json({ ok: true, env, db: 'connected', tables: tables.map((table) => table.tablename) });
  } catch (err) {
    res.status(500).json({ ok: false, env, db: 'error', error: String(err) });
  }
});

export default app;
