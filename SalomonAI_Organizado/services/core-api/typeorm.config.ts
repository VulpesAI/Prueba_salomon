import { DataSource } from 'typeorm';
import { loadRootEnv } from './src/config/env.loader';

loadRootEnv();

const databaseUrl = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;

let parsedHost: string | undefined;
let parsedPort: string | undefined;
let parsedUsername: string | undefined;
let parsedPassword: string | undefined;
let parsedDatabase: string | undefined;

if (databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    parsedHost = url.hostname;
    parsedPort = url.port;
    parsedUsername = url.username || undefined;
    parsedPassword = url.password || undefined;
    parsedDatabase = url.pathname?.replace(/^\//, '') || undefined;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(`Invalid POSTGRES_URL provided: ${error}`);
  }
}

const host =
  process.env.POSTGRES_HOST ??
  process.env.DATABASE_HOST ??
  parsedHost ??
  'db.supabase.co';
const portValue = process.env.POSTGRES_PORT ?? process.env.DATABASE_PORT ?? parsedPort;
const username =
  process.env.POSTGRES_USER ??
  process.env.DATABASE_USER ??
  parsedUsername ??
  'postgres';
const password =
  process.env.POSTGRES_PASSWORD ?? process.env.DATABASE_PASSWORD ?? parsedPassword ?? undefined;
const database =
  process.env.POSTGRES_DB ??
  process.env.DATABASE_NAME ??
  parsedDatabase ??
  'postgres';

export default new DataSource({
  type: 'postgres',
  host,
  port: portValue ? parseInt(portValue, 10) : 5432,
  username,
  password,
  database,
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['src/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: process.env.NODE_ENV !== 'production',
  ssl: { rejectUnauthorized: false },
});
