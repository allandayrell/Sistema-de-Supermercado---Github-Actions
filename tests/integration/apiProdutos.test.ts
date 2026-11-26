import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../../src/api/app.js';

describe('API de produtos (/api/produtos)', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    app = createApp();
  });

  it('lista o catálogo e filtra por estoque baixo e categoria', async () => {
    const todos = await request(app).get('/api/produtos');
    const baixos = await request(app).get('/api/produtos?estoqueBaixo=true');
    const bebidas = await request(app).get('/api/produtos?categoria=Bebidas');

    expect(todos.status).toBe(200);
    expect(todos.body.length).toBeGreaterThan(baixos.body.length);
    expect(baixos.body.every((p: { quantidade: number; estoqueMinimo: number }) => p.quantidade <= p.estoqueMinimo)).toBe(true);
    expect(bebidas.body.map((p: { sku: string }) => p.sku)).toEqual(['BEB-001']);
  });

  it('cadastra produto com 201 e rejeita payload inválido com 400', async () => {
    const criado = await request(app)
      .post('/api/produtos')
      .send({ sku: 'TST-001', nome: 'Suco de Uva', categoria: 'Bebidas', preco: 9.5, quantidade: 6, estoqueMinimo: 2 });
    const invalido = await request(app).post('/api/produtos').send({ nome: 'Sem preço', quantidade: 1 });

    expect(criado.status).toBe(201);
    expect(criado.body).toMatchObject({ sku: 'TST-001', nome: 'Suco de Uva', ativo: true });
    expect(invalido.status).toBe(400);
    expect(invalido.body.codigo).toBe('VALIDACAO_ERROR');
  });

  it('atualiza preço e repõe estoque de um produto existente', async () => {
    const preco = await request(app).patch('/api/produtos/MER-001').send({ preco: 29.9 });
    const reposicao = await request(app).post('/api/produtos/MER-001/repor').send({ quantidade: 6 });

    expect(preco.status).toBe(200);
    expect(preco.body.preco).toBe(29.9);
    expect(reposicao.body.quantidade).toBe(30);
  });

  it('remove produto com 204 e responde 404 para SKU inexistente', async () => {
    const remocao = await request(app).delete('/api/produtos/LIM-001');
    const inexistente = await request(app).post('/api/produtos/NAO-EXISTE/repor').send({ quantidade: 1 });
    const lista = await request(app).get('/api/produtos');

    expect(remocao.status).toBe(204);
    expect(inexistente.status).toBe(404);
    expect(lista.body.some((p: { sku: string }) => p.sku === 'LIM-001')).toBe(false);
  });
});
