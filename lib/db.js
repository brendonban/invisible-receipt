import { neon } from '@neondatabase/serverless';

// DATABASE_URL is added automatically when you connect a Neon (Postgres)
// database to the project from the Vercel dashboard → Storage.
export const hasDb = () => Boolean(process.env.DATABASE_URL);

let sql;
// Run a parameterised query ($1, $2 …) and return the rows.
export async function query(text, params = []) {
  if (!hasDb()) throw new Error('DATABASE_URL is not set');
  sql ??= neon(process.env.DATABASE_URL);
  return typeof sql.query === 'function' ? sql.query(text, params) : sql(text, params);
}

// Real and test sessions live in two separate tables with the same columns,
// so they can never be mixed up. Only these two names ever reach SQL.
export const TABLES = { real: 'sessions', test: 'test_sessions' };
export const tableFor = mode => (mode === 'real' ? TABLES.real : TABLES.test);
