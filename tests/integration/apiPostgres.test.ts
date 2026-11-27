import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/api/app.js';
import { criarExecucaoPostgres } from '../../src/api/postgres.js';
import type { Produto, ReciboVenda } from '../../src/shared/contracts.js';

const connectionString = process.env.TEST_DATABASE_URL;

describe.skipIf(!connectionString)('API com PostgreSQL compartilhado', () => {
  const schema = `teste_mercado_${randomUUID().replaceAll('-', '')}`;
  const banco = new Pool({ connectionString });
  const config = { connectionString, options: `-c search_path=${schema}` };
  const poolA = new Pool(config);
  const poolB = new Pool(config);

  beforeAll(async () => {
    await banco.query(`CREATE SCHEMA ${schema}`);
  });

  afterAll(async () => {
    try {
      await Promise.all([poolA.end(), poolB.end()]);
      await banco.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    } finally {
      await banco.end();
    }
  });

  it('persiste a venda e o saldo entre instâncias e impede vender a última unidade duas vezes', async () => {
    const apiA = request(createApp(criarExecucaoPostgres(poolA)));
    const apiB = request(createApp(criarExecucaoPostgres(poolB)));
    await Promise.all([apiA.get('/api/health').expect(200), apiB.get('/api/health').expect(200)]);

    const sku = 'TESTE-PG-01';
    await apiA.post('/api/produtos').send({ sku, nome: 'Maçã', preco: 5, quantidade: 1 }).expect(201);
    const pedido = { itens: [{ sku, quantidade: 1 }], pagamento: { forma: 'PIX' } };
    const vendas = await Promise.all([
      apiA.post('/api/checkout').send(pedido),
      apiB.post('/api/checkout').send(pedido),
    ]);
    expect(vendas.map(({ status }) => status).sort()).toEqual([201, 409]);
    const { id } = vendas.find(({ status }) => status === 201)!.body as ReciboVenda;

    const apiRecemIniciada = request(createApp(criarExecucaoPostgres(poolB)));
    const estoque = await apiRecemIniciada.get('/api/produtos?busca=TESTE-PG-01')
      .expect('Cache-Control', 'no-store')
      .expect(200);
    expect(estoque.body).toMatchObject([{ sku, nome: 'Maçã', quantidade: 0 }]);
    const historico = await apiRecemIniciada.get('/api/vendas').expect(200);
    expect(historico.body).toMatchObject([{ id, status: 'CONCLUIDA' }]);

    await apiB.post(`/api/vendas/${id}/estorno`).expect(200);
    const estoqueAposEstorno = await apiA.get('/api/produtos?busca=TESTE-PG-01').expect(200);
    expect((estoqueAposEstorno.body as Produto[])[0].quantidade).toBe(1);
    const historicoAposEstorno = await apiA.get('/api/vendas').expect(200);
    expect(historicoAposEstorno.body).toMatchObject([{ id, status: 'ESTORNADA' }]);
  });
});
