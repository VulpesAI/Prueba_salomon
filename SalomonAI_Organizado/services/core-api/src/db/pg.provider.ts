import { Pool, PoolClient } from 'pg';

export const PgPool = new Pool({
  host: process.env.PG_HOST ?? '127.0.0.1',
  port: Number(process.env.PG_PORT ?? 6432),
  database: process.env.PG_DB ?? 'salomon',
  user: process.env.PG_USER ?? 'salomon',
  password: process.env.PG_PASSWORD!,
  ssl: false,
  max: 40,
});

export async function withUser<T>(userId: string, fn: (client: PoolClient) => Promise<T>) {
  const client = await PgPool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL app.user_id = $1', [userId]);
    const res = await fn(client);
    await client.query('COMMIT');
    return res;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
