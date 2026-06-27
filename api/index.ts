import express from 'express';
import authRouter from './routes/auth.js';
import groupsRouter from './routes/groups.js';
import expensesRouter from './routes/expenses.js';
import joinRouter from './routes/join.js';

const app = express();
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/groups', expensesRouter);
app.use('/api', joinRouter);

app.get('/api/health', async (_req, res) => {
  const env = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    APP_JWT_SECRET: !!process.env.APP_JWT_SECRET,
    ALLOW_DEV_AUTH: process.env.ALLOW_DEV_AUTH ?? 'unset',
  };
  try {
    const { default: sql } = await import('./lib/db.js');
    await sql`SELECT 1`;
    const tables = await sql<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    res.json({ ok: true, env, db: 'connected', tables: tables.map((t) => t.tablename) });
  } catch (err) {
    res.status(500).json({ ok: false, env, db: 'error', error: String(err) });
  }
});

export default app;
