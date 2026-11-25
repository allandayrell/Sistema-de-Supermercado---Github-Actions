import { describe, expect, it } from 'vitest';
import {
  CupomInvalidoError,
  PagamentoInsuficienteError,
  ProdutoNaoEncontradoError,
  ValidacaoError,
} from '../../src/models/types.js';
import { CaixaService } from '../../src/services/CaixaService.js';

describe('CaixaService', () => {
  it('deve somar corretamente os itens adicionados ao carrinho', () => {
    const caixa = new CaixaService();

    caixa.adicionarItem('Arroz', 20.0, 2);
    caixa.adicionarItem('Feijão', 8.5, 3);
    caixa.adicionarItem('Arroz', 20.0, 1);

    expect(caixa.calcularSubtotal()).toBe(85.5);
    expect(caixa.listarItens()).toEqual([
      { nome: 'Arroz', precoUnitario: 20.0, quantidade: 3 },
      { nome: 'Feijão', precoUnitario: 8.5, quantidade: 3 },
    ]);
  });

  it('deve aplicar desconto de 10% com o cupom DESC10', () => {
    const caixa = new CaixaService();

    caixa.adicionarItem('Café', 25.0, 4);
    caixa.aplicarCupom('desc10');

    const resumo = caixa.calcularResumo();

    expect(resumo.subtotal).toBe(100);
    expect(resumo.cupomAplicado).toBe('DESC10');
    expect(resumo.descontoCupom).toBe(10);
    expect(resumo.descontoExtra).toBe(0);
    expect(resumo.totalFinal).toBe(90);
  });

  it('deve aplicar 5% de desconto extra quando o subtotal ultrapassar R$ 200', () => {
    const caixa = new CaixaService();

    caixa.adicionarItem('Azeite', 50.0, 5);
    caixa.aplicarCupom('DESC10');

    const resumo = caixa.calcularResumo();

    expect(resumo.subtotal).toBe(250);
    expect(resumo.descontoCupom).toBe(25);
    expect(resumo.descontoExtra).toBe(12.5);
    expect(resumo.totalDesconto).toBe(37.5);
    expect(resumo.totalFinal).toBe(212.5);
  });

  it('não deve aplicar desconto extra quando o subtotal for exatamente R$ 200', () => {
    const caixa = new CaixaService();
    caixa.adicionarItem('Queijo', 40.0, 5);

    const resumo = caixa.calcularResumo();

    expect(resumo.subtotal).toBe(200);
    expect(resumo.descontoExtra).toBe(0);
    expect(resumo.totalFinal).toBe(200);
  });

  it('deve bloquear adição de item com preço negativo ou quantidade zero', () => {
    const caixa = new CaixaService();

    expect(() => caixa.adicionarItem('Leite', -10, 1)).toThrow(ValidacaoError);
    expect(() => caixa.adicionarItem('Leite', 10, 0)).toThrow(ValidacaoError);
    expect(() => caixa.adicionarItem('Leite', 10, -2)).toThrow(ValidacaoError);
  });

  it('deve lançar erro para cupom inválido e permitir remover cupom e itens', () => {
    const caixa = new CaixaService();
    caixa.adicionarItem('Pão', 10, 2);

    expect(() => caixa.aplicarCupom('CUPOM99')).toThrow(CupomInvalidoError);

    caixa.aplicarCupom('DESC10');
    caixa.removerCupom();
    expect(caixa.calcularResumo().totalFinal).toBe(20);

    expect(caixa.removerItem('Pão')).toBe(true);
    expect(caixa.removerItem('Pão')).toBe(false);
    expect(caixa.calcularSubtotal()).toBe(0);
  });

  it('deve atualizar a quantidade de um item existente por nome ou SKU e recalcular o subtotal', () => {
    const caixa = new CaixaService();
    caixa.adicionarItem('Arroz', 25.0, 2, 'MER-001');

    const atualizado = caixa.atualizarQuantidade('mer-001', 4);

    expect(atualizado.quantidade).toBe(4);
    expect(caixa.calcularSubtotal()).toBe(100);
    expect(caixa.listarCuponsDisponiveis().map((c) => c.codigo)).toEqual([
      'DESC10',
      'HORIZONTE15',
    ]);
  });

  it('deve bloquear atualização de quantidade inválida ou item ausente no carrinho', () => {
    const caixa = new CaixaService();
    caixa.adicionarItem('Café', 30.0, 1);

    expect(() => caixa.atualizarQuantidade('Café', 0)).toThrow(ValidacaoError);
    expect(() => caixa.atualizarQuantidade('Café', -2)).toThrow(ValidacaoError);
    expect(() => caixa.atualizarQuantidade('Inexistente', 2)).toThrow(
      ProdutoNaoEncontradoError,
    );
  });

  it('deve aplicar cupom fixo HORIZONTE15 quando o subtotal for maior ou igual a R$ 100', () => {
    const caixa = new CaixaService();
    caixa.adicionarItem('Azeite', 50.0, 2);

    caixa.aplicarCupom('horizonte15');
    const resumo = caixa.calcularResumo();

    expect(resumo.cupomAplicado).toBe('HORIZONTE15');
    expect(resumo.descontoCupom).toBe(15);
    expect(resumo.descontoExtra).toBe(0);
    expect(resumo.totalFinal).toBe(85);
  });

  it('deve rejeitar cupom HORIZONTE15 quando o subtotal for menor que R$ 100', () => {
    const caixa = new CaixaService();
    caixa.adicionarItem('Feijão', 10.0, 9);

    expect(() => caixa.aplicarCupom('HORIZONTE15')).toThrow(CupomInvalidoError);
    expect(() => caixa.aplicarCupom('HORIZONTE15')).toThrow(/mínimo/i);
  });

  it('deve calcular o troco corretamente no pagamento em dinheiro', () => {
    const caixa = new CaixaService();
    caixa.adicionarItem('Leite', 5.5, 3);

    const pagamento = caixa.calcularPagamento({
      forma: 'DINHEIRO',
      valorRecebido: 20,
    });

    expect(pagamento).toEqual({
      formaPagamento: 'DINHEIRO',
      totalFinal: 16.5,
      valorPago: 20,
      troco: 3.5,
    });
  });

  it('deve rejeitar pagamento em dinheiro com valor insuficiente ou ausente', () => {
    const caixa = new CaixaService();
    caixa.adicionarItem('Pão', 15.0, 2);

    expect(() =>
      caixa.calcularPagamento({ forma: 'DINHEIRO', valorRecebido: 25 }),
    ).toThrow(PagamentoInsuficienteError);
    expect(() => caixa.calcularPagamento({ forma: 'DINHEIRO' })).toThrow(
      ValidacaoError,
    );
  });

  it('deve calcular pagamento PIX e CARTAO sem troco e impedir pagamento com carrinho vazio', () => {
    const vazio = new CaixaService();
    expect(() => vazio.calcularPagamento({ forma: 'PIX' })).toThrow(
      ValidacaoError,
    );

    const caixa = new CaixaService();
    caixa.adicionarItem('Queijo', 40.0, 2);

    expect(caixa.calcularPagamento({ forma: 'PIX' })).toEqual({
      formaPagamento: 'PIX',
      totalFinal: 80,
      valorPago: 80,
      troco: 0,
    });
    expect(caixa.calcularPagamento({ forma: 'CARTAO' })).toEqual({
      formaPagamento: 'CARTAO',
      totalFinal: 80,
      valorPago: 80,
      troco: 0,
    });
  });
});
