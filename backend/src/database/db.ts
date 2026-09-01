import { Pool, type QueryResult, type QueryResultRow } from 'pg';
import { config } from '../config.js';

export const pool = config.DATABASE_URL ? new Pool({ connectionString: config.DATABASE_URL, max: 10 }) : null;
export const isDatabaseEnabled = Boolean(pool);

export async function query<T extends QueryResultRow>(text: string, values: unknown[] = []): Promise<QueryResult<T>> {
  if (!pool) throw new Error('DATABASE_NOT_CONFIGURED');
  return pool.query<T>(text, values);
}

export async function closeDatabase() { if (pool) await pool.end(); }
