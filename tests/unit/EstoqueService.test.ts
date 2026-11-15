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

    expect(criado).toEqual({ nome: 'Arroz', preco: 24.9, quantidade: 10 });
    expect(estoque.consultarProduto('arroz')).toEqual({
      nome: 'Arroz',
      preco: 24.9,
      quantidade: 10,
    });
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
});
