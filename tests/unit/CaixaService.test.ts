import { describe, expect, it } from 'vitest';
import {
  CupomInvalidoError,
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
    expect(caixa.calcularSubtotal()).toBe(0);
  });
});
