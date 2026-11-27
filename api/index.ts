import { Pool } from 'pg';
import { createApp } from '../src/api/app.js';
import { criarExecucaoPostgres } from '../src/api/postgres.js';

const connectionString = process.env.DATABASE_URL;
if (!connectionString && process.env.VERCEL_ENV === 'production') {
  throw new Error('Configure DATABASE_URL para armazenar o estoque e as vendas em produção.');
}

const pool = connectionString && new Pool({
  connectionString,
  connectionTimeoutMillis: 10_000,
});
if (pool) {
  pool.on('error', () => console.error('Conexão ociosa com o PostgreSQL interrompida.'));
}

export default pool ? createApp(criarExecucaoPostgres(pool)) : createApp();
