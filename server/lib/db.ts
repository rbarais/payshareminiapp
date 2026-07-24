import postgres from 'postgres';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Le pooler Supabase (mode transaction) ne garde pas les prepared statements
// entre deux requêtes : chaque requête peut tomber sur une autre connexion.
const sql = postgres(process.env.DATABASE_URL, { prepare: false });

export default sql;
