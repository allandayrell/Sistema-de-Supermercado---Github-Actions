import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/api/app.js';

describe('API de vendas, estorno e dashboard', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  async function vender(sku: string, quantidade: number) {
    const resposta = await request(app)
      .post('/api/checkout')
      .send({ itens: [{ sku, quantidade }], pagamento: { forma: 'PIX' } });
    return resposta.body as { id: string; totalFinal: number };
  }

  it('lista o histórico da venda mais recente para a mais antiga', async () => {
    const primeira = await vender('MER-002', 1);
    const segunda = await vender('LAT-001', 1);

    const resposta = await request(app).get('/api/vendas');

    expect(resposta.status).toBe(200);
    expect(resposta.body.map((v: { id: string }) => v.id)).toEqual([segunda.id, primeira.id]);
  });

  it('estorna a venda, devolve o estoque e bloqueia um segundo estorno com 409', async () => {
    const venda = await vender('PAD-001', 4);

    const estorno = await request(app).post(`/api/vendas/${venda.id}/estorno`);
    const repetido = await request(app).post(`/api/vendas/${venda.id}/estorno`);
    const produtos = await request(app).get('/api/produtos');

    expect(estorno.status).toBe(200);
    expect(estorno.body.status).toBe('ESTORNADA');
    expect(repetido.status).toBe(409);
    expect(produtos.body.find((p: { sku: string }) => p.sku === 'PAD-001').quantidade).toBe(14);
  });

  it('responde 404 ao estornar venda inexistente', async () => {
    const resposta = await request(app).post('/api/vendas/nao-existe/estorno');

    expect(resposta.status).toBe(404);
    expect(resposta.body.codigo).toBe('NAO_ENCONTRADO');
  });

  it('dashboard reflete vendas concluídas e estornadas', async () => {
    const mantida = await vender('MER-002', 2);
    const estornada = await vender('MER-001', 1);
    await request(app).post(`/api/vendas/${estornada.id}/estorno`);

    const resposta = await request(app).get('/api/dashboard');

    expect(resposta.status).toBe(200);
    expect(resposta.body).toMatchObject({
      faturamentoLiquido: mantida.totalFinal,
      totalVendasConcluidas: 1,
      totalVendasEstornadas: 1,
      ticketMedio: mantida.totalFinal,
    });
    expect(resposta.body.produtosEstoqueBaixo).toBeGreaterThan(0);
  });
});
