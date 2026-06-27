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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

export default app;
