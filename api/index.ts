import { Pool } from 'pg';
import { createApp, createDefaultContainer } from '../src/api/app.js';
import { criarExecucaoPostgres } from '../src/api/postgres.js';

const connectionString = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

const pool =
  connectionString &&
  new Pool({
    connectionString,
    connectionTimeoutMillis: 10_000,
  });

if (pool) {
  pool.on('error', () =>
    console.error('Conexão ociosa com o PostgreSQL interrompida.'),
  );
}

const fallbackDataDir =
  process.env.DATA_DIR ??
  (process.env.VERCEL ? '/tmp/mercado-horizonte' : undefined);

export default pool
  ? createApp(criarExecucaoPostgres(pool))
  : createApp(createDefaultContainer(fallbackDataDir));
