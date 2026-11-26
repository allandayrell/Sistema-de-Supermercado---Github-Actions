import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/api/app.js';

describe('API de caixa e checkout', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  async function estoqueDe(sku: string): Promise<number> {
    const resposta = await request(app).get('/api/produtos');
    return resposta.body.find((p: { sku: string }) => p.sku === sku).quantidade;
  }

  it('simula o carrinho com cupom e bônus acima de R$ 200 sem baixar estoque', async () => {
    const resposta = await request(app)
      .post('/api/caixa/simular')
      .send({ itens: [{ sku: 'MER-001', quantidade: 8 }], cupom: 'DESC10' });

    expect(resposta.status).toBe(200);
    expect(resposta.body.subtotal).toBe(215.2);
    expect(resposta.body.descontoCupom).toBe(21.52);
    expect(resposta.body.descontoExtra).toBe(10.76);
    expect(resposta.body.totalFinal).toBe(182.92);
    expect(await estoqueDe('MER-001')).toBe(24);
  });

  it('responde 400 para cupom inválido na simulação', async () => {
    const resposta = await request(app)
      .post('/api/caixa/simular')
      .send({ itens: [{ sku: 'MER-001', quantidade: 1 }], cupom: 'HORIZONTE15' });

    expect(resposta.status).toBe(400);
    expect(resposta.body.codigo).toBe('CUPOM_INVALIDO');
  });

  it('finaliza compra em dinheiro com 201, recibo com troco e baixa de estoque', async () => {
    const resposta = await request(app)
      .post('/api/checkout')
      .send({
        itens: [{ sku: 'LAT-001', quantidade: 2 }],
        pagamento: { forma: 'DINHEIRO', valorRecebido: 20 },
      });

    expect(resposta.status).toBe(201);
    expect(resposta.body).toMatchObject({
      status: 'CONCLUIDA',
      totalFinal: 10.8,
      formaPagamento: 'DINHEIRO',
      valorPago: 20,
      troco: 9.2,
    });
    expect(await estoqueDe('LAT-001')).toBe(28);
  });

  it('responde 409 e preserva todo o estoque quando um item do carrinho falta', async () => {
    const resposta = await request(app)
      .post('/api/checkout')
      .send({
        itens: [
          { sku: 'MER-002', quantidade: 2 },
          { sku: 'HOR-001', quantidade: 10 },
        ],
        pagamento: { forma: 'PIX' },
      });

    expect(resposta.status).toBe(409);
    expect(resposta.body.codigo).toBe('CONFLITO_DOMINIO');
    expect(await estoqueDe('MER-002')).toBe(18);
    expect(await estoqueDe('HOR-001')).toBe(3);
  });

  it('responde 400 quando o dinheiro recebido não cobre o total', async () => {
    const resposta = await request(app)
      .post('/api/checkout')
      .send({
        itens: [{ sku: 'MER-001', quantidade: 1 }],
        pagamento: { forma: 'DINHEIRO', valorRecebido: 10 },
      });

    expect(resposta.status).toBe(400);
    expect(resposta.body.codigo).toBe('PAGAMENTO_INSUFICIENTE');
    expect(await estoqueDe('MER-001')).toBe(24);
  });
});
