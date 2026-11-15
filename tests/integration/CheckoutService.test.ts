import { describe, expect, it } from 'vitest';
import {
  EstoqueInsuficienteError,
  ValidacaoError,
} from '../../src/models/types.js';
import { CaixaService } from '../../src/services/CaixaService.js';
import { CheckoutService } from '../../src/services/CheckoutService.js';
import { EstoqueService } from '../../src/services/EstoqueService.js';

describe('CheckoutService (Integração)', () => {
  it('deve concluir compra com cupom DESC10, emitir recibo e baixar estoque para 7 unidades', () => {
    const estoque = new EstoqueService();
    const caixa = new CaixaService();
    const checkout = new CheckoutService(estoque, caixa);

    estoque.cadastrarProduto('Arroz', 20.0, 10);

    checkout.adicionarProdutoAoCarrinho('Arroz', 3);
    caixa.aplicarCupom('DESC10');

    const recibo = checkout.finalizarCompra();

    expect(recibo.id).toBeTruthy();
    expect(recibo.subtotal).toBe(60);
    expect(recibo.descontoCupom).toBe(6);
    expect(recibo.descontoExtra).toBe(0);
    expect(recibo.totalFinal).toBe(54);
    expect(recibo.cupomAplicado).toBe('DESC10');
    expect(estoque.consultarProduto('Arroz').quantidade).toBe(7);
    expect(caixa.listarItens()).toHaveLength(0);
  });

  it('deve falhar venda de 15 unidades de Arroz e manter estoque intacto em 10 (Rollback)', () => {
    const estoque = new EstoqueService();
    const caixa = new CaixaService();
    const checkout = new CheckoutService(estoque, caixa);

    estoque.cadastrarProduto('Arroz', 20.0, 10);
    checkout.adicionarProdutoAoCarrinho('Arroz', 15);

    expect(() => checkout.finalizarCompra()).toThrow(EstoqueInsuficienteError);
    expect(estoque.consultarProduto('Arroz').quantidade).toBe(10);
  });

  it('deve garantir atomicidade (rollback) em carrinho multi-item quando um item não tem estoque', () => {
    const estoque = new EstoqueService();
    const caixa = new CaixaService();
    const checkout = new CheckoutService(estoque, caixa);

    estoque.cadastrarProduto('Arroz', 20.0, 10);
    estoque.cadastrarProduto('Feijão', 10.0, 4);

    checkout.adicionarProdutoAoCarrinho('Arroz', 3);
    checkout.adicionarProdutoAoCarrinho('Feijão', 6);

    expect(() => checkout.finalizarCompra()).toThrow(EstoqueInsuficienteError);
    expect(estoque.consultarProduto('Arroz').quantidade).toBe(10);
    expect(estoque.consultarProduto('Feijão').quantidade).toBe(4);
  });

  it('deve impedir finalização de compra com carrinho vazio', () => {
    const estoque = new EstoqueService();
    const caixa = new CaixaService();
    const checkout = new CheckoutService(estoque, caixa);

    expect(() => checkout.finalizarCompra()).toThrow(ValidacaoError);
  });
});
