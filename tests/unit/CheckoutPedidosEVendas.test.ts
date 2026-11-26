import { beforeEach, describe, expect, it } from 'vitest';
import {
  CupomInvalidoError,
  EstoqueInsuficienteError,
  PagamentoInsuficienteError,
  ValidacaoError,
  VendaJaEstornadaError,
  VendaNaoEncontradaError,
} from '../../src/models/types.js';
import { CaixaService } from '../../src/services/CaixaService.js';
import { CheckoutService } from '../../src/services/CheckoutService.js';
import { EstoqueService } from '../../src/services/EstoqueService.js';

describe('CheckoutService - pedidos, histórico, estorno e dashboard', () => {
  let estoque: EstoqueService;
  let checkout: CheckoutService;

  beforeEach(() => {
    estoque = new EstoqueService();
    checkout = new CheckoutService(estoque, new CaixaService());
    estoque.cadastrarProduto('Arroz', 20, 10, { sku: 'ARR-1', estoqueMinimo: 2 });
    estoque.cadastrarProduto('Feijão', 10, 4, { sku: 'FEI-1', estoqueMinimo: 2 });
  });

  describe('simularPedido', () => {
    it('calcula subtotal e desconto do cupom sem baixar o estoque', () => {
      const resumo = checkout.simularPedido({
        itens: [{ sku: 'ARR-1', quantidade: 2 }],
        cupom: 'desc10',
      });

      expect(resumo.subtotal).toBe(40);
      expect(resumo.descontoCupom).toBe(4);
      expect(resumo.totalFinal).toBe(36);
      expect(estoque.consultarProduto('ARR-1').quantidade).toBe(10);
    });

    it('rejeita pedido sem itens', () => {
      expect(() => checkout.simularPedido({ itens: [] })).toThrow(ValidacaoError);
    });

    it('rejeita item com quantidade não inteira', () => {
      expect(() =>
        checkout.simularPedido({ itens: [{ sku: 'ARR-1', quantidade: 1.5 }] }),
      ).toThrow(ValidacaoError);
    });

    it('rejeita cupom inexistente', () => {
      expect(() =>
        checkout.simularPedido({ itens: [{ sku: 'ARR-1', quantidade: 1 }], cupom: 'FAKE' }),
      ).toThrow(CupomInvalidoError);
    });
  });

  describe('finalizarPedido', () => {
    it('registra a venda com forma de pagamento, valor pago e troco', () => {
      const recibo = checkout.finalizarPedido({
        itens: [{ sku: 'ARR-1', quantidade: 1 }],
        pagamento: { forma: 'DINHEIRO', valorRecebido: 50 },
      });

      expect(recibo.status).toBe('CONCLUIDA');
      expect(recibo.formaPagamento).toBe('DINHEIRO');
      expect(recibo.valorPago).toBe(50);
      expect(recibo.troco).toBe(30);
      expect(recibo.itens[0].sku).toBe('ARR-1');
      expect(estoque.consultarProduto('ARR-1').quantidade).toBe(9);
      expect(checkout.listarVendas()).toHaveLength(1);
    });

    it('não baixa nenhum item quando um deles não tem estoque suficiente', () => {
      expect(() =>
        checkout.finalizarPedido({
          itens: [
            { sku: 'ARR-1', quantidade: 2 },
            { sku: 'FEI-1', quantidade: 5 },
          ],
          pagamento: { forma: 'PIX' },
        }),
      ).toThrow(EstoqueInsuficienteError);

      expect(estoque.consultarProduto('ARR-1').quantidade).toBe(10);
      expect(estoque.consultarProduto('FEI-1').quantidade).toBe(4);
      expect(checkout.listarVendas()).toHaveLength(0);
    });

    it('não baixa estoque quando o dinheiro recebido é menor que o total', () => {
      expect(() =>
        checkout.finalizarPedido({
          itens: [{ sku: 'ARR-1', quantidade: 1 }],
          pagamento: { forma: 'DINHEIRO', valorRecebido: 5 },
        }),
      ).toThrow(PagamentoInsuficienteError);

      expect(estoque.consultarProduto('ARR-1').quantidade).toBe(10);
    });
  });

  describe('listarVendas', () => {
    it('retorna as vendas da mais recente para a mais antiga', () => {
      const primeira = checkout.finalizarPedido({
        itens: [{ sku: 'ARR-1', quantidade: 1 }],
        pagamento: { forma: 'PIX' },
      });
      const segunda = checkout.finalizarPedido({
        itens: [{ sku: 'FEI-1', quantidade: 1 }],
        pagamento: { forma: 'CARTAO' },
      });

      expect(checkout.listarVendas().map((venda) => venda.id)).toEqual([
        segunda.id,
        primeira.id,
      ]);
    });
  });

  describe('estornarVenda', () => {
    it('devolve as quantidades ao estoque e marca a venda como estornada', () => {
      const venda = checkout.finalizarPedido({
        itens: [
          { sku: 'ARR-1', quantidade: 3 },
          { sku: 'FEI-1', quantidade: 2 },
        ],
        pagamento: { forma: 'PIX' },
      });

      const estornada = checkout.estornarVenda(venda.id);

      expect(estornada.status).toBe('ESTORNADA');
      expect(estornada.estornadaEm).toBeDefined();
      expect(estoque.consultarProduto('ARR-1').quantidade).toBe(10);
      expect(estoque.consultarProduto('FEI-1').quantidade).toBe(4);
    });

    it('impede estornar a mesma venda duas vezes', () => {
      const venda = checkout.finalizarPedido({
        itens: [{ sku: 'ARR-1', quantidade: 1 }],
        pagamento: { forma: 'PIX' },
      });
      checkout.estornarVenda(venda.id);

      expect(() => checkout.estornarVenda(venda.id)).toThrow(VendaJaEstornadaError);
      expect(estoque.consultarProduto('ARR-1').quantidade).toBe(10);
    });

    it('falha para venda inexistente', () => {
      expect(() => checkout.estornarVenda('nao-existe')).toThrow(VendaNaoEncontradaError);
    });
  });

  describe('obterDashboardResumo', () => {
    it('ignora vendas estornadas no faturamento e no ticket médio', () => {
      checkout.finalizarPedido({
        itens: [{ sku: 'ARR-1', quantidade: 1 }],
        pagamento: { forma: 'PIX' },
      });
      checkout.finalizarPedido({
        itens: [{ sku: 'FEI-1', quantidade: 1 }],
        pagamento: { forma: 'PIX' },
      });
      const estornada = checkout.finalizarPedido({
        itens: [{ sku: 'ARR-1', quantidade: 2 }],
        pagamento: { forma: 'PIX' },
      });
      checkout.estornarVenda(estornada.id);

      const resumo = checkout.obterDashboardResumo();

      expect(resumo.faturamentoLiquido).toBe(30);
      expect(resumo.totalVendasConcluidas).toBe(2);
      expect(resumo.totalVendasEstornadas).toBe(1);
      expect(resumo.ticketMedio).toBe(15);
    });

    it('conta produtos ativos e com estoque baixo', () => {
      checkout.finalizarPedido({
        itens: [{ sku: 'FEI-1', quantidade: 2 }],
        pagamento: { forma: 'PIX' },
      });

      const resumo = checkout.obterDashboardResumo();

      expect(resumo.totalProdutosAtivos).toBe(2);
      expect(resumo.produtosEstoqueBaixo).toBe(1);
    });

    it('retorna zeros quando ainda não há vendas', () => {
      const resumo = checkout.obterDashboardResumo();

      expect(resumo.faturamentoLiquido).toBe(0);
      expect(resumo.ticketMedio).toBe(0);
      expect(resumo.totalVendasConcluidas).toBe(0);
    });
  });
});
