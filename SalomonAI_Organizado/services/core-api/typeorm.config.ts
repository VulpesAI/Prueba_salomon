import { DataSource } from 'typeorm';
import * as path from 'path';
import * as dotenv from 'dotenv';

const nodeEnv = process.env.NODE_ENV ?? 'development';
const envFile = nodeEnv === 'production' ? '.env' : '.env.development';

dotenv.config({ path: path.resolve(__dirname, envFile) });

const host = process.env.POSTGRES_HOST ?? process.env.DATABASE_HOST ?? 'postgres';
const portValue = process.env.POSTGRES_PORT ?? process.env.DATABASE_PORT;
const username = process.env.POSTGRES_USER ?? process.env.DATABASE_USER ?? 'salomon_user';
const password = process.env.POSTGRES_PASSWORD ?? process.env.DATABASE_PASSWORD ?? undefined;
const database = process.env.POSTGRES_DB ?? process.env.DATABASE_NAME ?? 'salomon_db';

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
  ssl: false,
});
