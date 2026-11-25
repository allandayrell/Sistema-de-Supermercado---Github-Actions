import { describe, expect, it } from 'vitest';
import {
  EstoqueInsuficienteError,
  ProdutoNaoEncontradoError,
  ValidacaoError,
} from '../../src/models/types.js';
import { EstoqueService } from '../../src/services/EstoqueService.js';

describe('EstoqueService', () => {
  it('deve cadastrar e consultar um produto corretamente', () => {
    const estoque = new EstoqueService();

    const criado = estoque.cadastrarProduto('Arroz', 24.9, 10);

    expect(criado).toMatchObject({ nome: 'Arroz', preco: 24.9, quantidade: 10, ativo: true });
    expect(criado.sku).toBe('SKU-ARROZ');
    expect(estoque.consultarProduto('arroz')).toMatchObject({
      nome: 'Arroz',
      preco: 24.9,
      quantidade: 10,
    });
    expect(estoque.consultarProduto('SKU-ARROZ').nome).toBe('Arroz');
    expect(estoque.listarProdutos()).toHaveLength(1);
  });

  it('deve bloquear cadastro de produto com preço negativo', () => {
    const estoque = new EstoqueService();

    expect(() => estoque.cadastrarProduto('Leite', -5.5, 10)).toThrow(
      ValidacaoError,
    );
    expect(() => estoque.cadastrarProduto('Leite', -0.01, 10)).toThrow(
      /negativo/i,
    );
  });

  it('deve bloquear cadastro de produto com quantidade zero ou negativa', () => {
    const estoque = new EstoqueService();

    expect(() => estoque.cadastrarProduto('Açúcar', 8.0, 0)).toThrow(
      ValidacaoError,
    );
    expect(() => estoque.cadastrarProduto('Açúcar', 8.0, -3)).toThrow(
      ValidacaoError,
    );
  });

  it('deve bloquear cadastro com nome vazio ou produto duplicado', () => {
    const estoque = new EstoqueService();
    estoque.cadastrarProduto('Café', 18.5, 5);

    expect(() => estoque.cadastrarProduto('   ', 10, 2)).toThrow(
      ValidacaoError,
    );
    expect(() => estoque.cadastrarProduto('café', 18.5, 5)).toThrow(
      ValidacaoError,
    );
  });

  it('deve lançar erro "Estoque insuficiente" ao tentar retirar mais itens que o disponível', () => {
    const estoque = new EstoqueService();
    estoque.cadastrarProduto('Arroz', 20.0, 5);

    expect(() => estoque.baixarEstoque('Arroz', 6)).toThrow(
      EstoqueInsuficienteError,
    );
    expect(() => estoque.baixarEstoque('Arroz', 6)).toThrow(
      /Estoque insuficiente/,
    );
    expect(estoque.consultarProduto('Arroz').quantidade).toBe(5);
  });

  it('deve repor estoque existente e lançar erro para produto inexistente', () => {
    const estoque = new EstoqueService();
    estoque.cadastrarProduto('Macarrão', 6.5, 4);

    const atualizado = estoque.reporEstoque('Macarrão', 6);
    expect(atualizado.quantidade).toBe(10);

    expect(() => estoque.consultarProduto('Inexistente')).toThrow(
      ProdutoNaoEncontradoError,
    );
    expect(() => estoque.reporEstoque('Inexistente', 2)).toThrow(
      ProdutoNaoEncontradoError,
    );
  });

  it('deve cadastrar produto com SKU, categoria e estoque mínimo explícitos', () => {
    const estoque = new EstoqueService();

    const produto = estoque.cadastrarProduto('Iogurte Natural', 7.5, 12, {
      sku: 'lat-050',
      categoria: 'Laticínios',
      estoqueMinimo: 4,
    });

    expect(produto).toEqual({
      sku: 'LAT-050',
      nome: 'Iogurte Natural',
      categoria: 'Laticínios',
      preco: 7.5,
      quantidade: 12,
      estoqueMinimo: 4,
      ativo: true,
    });
  });

  it('deve bloquear cadastro com SKU duplicado ou estoque mínimo negativo', () => {
    const estoque = new EstoqueService();
    estoque.cadastrarProduto('Leite Desnatado', 5.2, 10, { sku: 'LAT-001' });

    expect(() =>
      estoque.cadastrarProduto('Outro Leite', 5.2, 10, { sku: 'lat-001' }),
    ).toThrow(ValidacaoError);
    expect(() =>
      estoque.cadastrarProduto('Manteiga', 12.0, 8, { estoqueMinimo: -1 }),
    ).toThrow(ValidacaoError);
  });

  it('deve atualizar o preço de um produto e rejeitar preço negativo ou produto ausente', () => {
    const estoque = new EstoqueService();
    estoque.cadastrarProduto('Café Torrado', 29.9, 10, { sku: 'BEB-010' });

    const atualizado = estoque.atualizarPreco('BEB-010', 31.456);
    expect(atualizado.preco).toBe(31.46);

    expect(() => estoque.atualizarPreco('BEB-010', -1)).toThrow(ValidacaoError);
    expect(() => estoque.atualizarPreco('NAO-EXISTE', 10)).toThrow(
      ProdutoNaoEncontradoError,
    );
  });

  it('deve remover um produto cadastrado e lançar erro ao remover item inexistente', () => {
    const estoque = new EstoqueService();
    estoque.cadastrarProduto('Biscoito', 4.5, 20, { sku: 'MER-020' });

    expect(estoque.removerProduto('MER-020')).toBe(true);
    expect(() => estoque.consultarProduto('MER-020')).toThrow(
      ProdutoNaoEncontradoError,
    );
    expect(() => estoque.removerProduto('MER-020')).toThrow(
      ProdutoNaoEncontradoError,
    );
  });

  it('deve filtrar produtos por busca textual e por categoria', () => {
    const estoque = new EstoqueService();
    estoque.cadastrarProduto('Arroz Branco', 25.0, 15, {
      sku: 'MER-101',
      categoria: 'Mercearia',
    });
    estoque.cadastrarProduto('Suco de Laranja', 11.0, 8, {
      sku: 'BEB-102',
      categoria: 'Bebidas',
    });

    expect(estoque.listarProdutos({ busca: 'beb-102' })).toHaveLength(1);
    expect(estoque.listarProdutos({ busca: 'arroz' })[0].sku).toBe('MER-101');
    expect(estoque.listarProdutos({ categoria: 'Bebidas' })).toHaveLength(1);
  });

  it('deve listar apenas os produtos com quantidade menor ou igual ao estoque mínimo', () => {
    const estoque = new EstoqueService();
    estoque.cadastrarProduto('Azeite', 38.0, 4, {
      sku: 'MER-201',
      estoqueMinimo: 5,
    });
    estoque.cadastrarProduto('Detergente', 3.0, 5, {
      sku: 'LIM-202',
      estoqueMinimo: 5,
    });
    estoque.cadastrarProduto('Sal', 2.5, 12, {
      sku: 'MER-203',
      estoqueMinimo: 5,
    });

    const criticos = estoque.listarEstoqueBaixo();

    expect(criticos.map((item) => item.sku)).toEqual(['MER-201', 'LIM-202']);
  });
});
