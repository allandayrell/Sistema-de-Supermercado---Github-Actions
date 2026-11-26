import { randomUUID } from 'node:crypto';
import {
  CheckoutRequest,
  DashboardResumo,
  ItemCarrinho,
  ItemPedidoInput,
  PagamentoInput,
  ProdutoNaoEncontradoError,
  ReciboVenda,
  ResumoCaixa,
  SimularCaixaRequest,
  ValidacaoError,
  VendaJaEstornadaError,
  VendaNaoEncontradaError,
} from '../models/types.js';
import { InMemoryVendaRepository } from '../repositories/InMemoryVendaRepository.js';
import { IVendaRepository } from '../repositories/IVendaRepository.js';
import { CaixaService } from './CaixaService.js';
import { EstoqueService } from './EstoqueService.js';

function arredondarMoeda(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export class CheckoutService {
  constructor(
    private readonly estoqueService: EstoqueService,
    private readonly caixaService: CaixaService,
    private readonly vendaRepository: IVendaRepository = new InMemoryVendaRepository(),
  ) {}

  adicionarProdutoAoCarrinho(identificador: string, quantidade: number): ItemCarrinho {
    return this.adicionarAoCaixa(this.caixaService, identificador, quantidade);
  }

  finalizarCompra(pagamento?: PagamentoInput): ReciboVenda {
    const recibo = this.fecharVenda(this.caixaService, pagamento);
    this.caixaService.limparCarrinho();
    return recibo;
  }

  /**
   * Calcula o resumo financeiro de um pedido sem alterar o estoque.
   * Usa um caixa novo a cada chamada, o que torna a API stateless.
   */
  simularPedido(pedido: SimularCaixaRequest): ResumoCaixa {
    return this.montarCaixa(pedido).calcularResumo();
  }

  finalizarPedido(pedido: CheckoutRequest): ReciboVenda {
    if (!pedido.pagamento) {
      throw new ValidacaoError('Informe a forma de pagamento');
    }
    return this.fecharVenda(this.montarCaixa(pedido), pedido.pagamento);
  }

  listarVendas(): ReciboVenda[] {
    // Inverte antes da ordenação estável para que vendas no mesmo milissegundo
    // também apareçam da mais recente para a mais antiga.
    return this.vendaRepository
      .listarTodas()
      .reverse()
      .sort((a, b) => Date.parse(b.data) - Date.parse(a.data));
  }

  estornarVenda(vendaId: string): ReciboVenda {
    const venda = this.vendaRepository.buscarPorId(vendaId);
    if (!venda) {
      throw new VendaNaoEncontradaError(vendaId);
    }
    if (venda.status === 'ESTORNADA') {
      throw new VendaJaEstornadaError(vendaId);
    }

    // Confere todos os produtos antes de devolver qualquer unidade (estorno atômico).
    for (const item of venda.itens) {
      const identificador = item.sku ?? item.nome;
      if (!this.estoqueService.existeProduto(identificador)) {
        throw new ProdutoNaoEncontradoError(identificador);
      }
    }

    for (const item of venda.itens) {
      this.estoqueService.reporEstoque(item.sku ?? item.nome, item.quantidade);
    }

    return this.vendaRepository.atualizar({
      ...venda,
      status: 'ESTORNADA',
      estornadaEm: new Date().toISOString(),
    });
  }

  obterDashboardResumo(): DashboardResumo {
    const vendas = this.vendaRepository.listarTodas();
    const concluidas = vendas.filter((venda) => venda.status === 'CONCLUIDA');
    const faturamentoLiquido = arredondarMoeda(
      concluidas.reduce((soma, venda) => soma + venda.totalFinal, 0),
    );

    return {
      faturamentoLiquido,
      totalVendasConcluidas: concluidas.length,
      totalVendasEstornadas: vendas.length - concluidas.length,
      ticketMedio:
        concluidas.length > 0 ? arredondarMoeda(faturamentoLiquido / concluidas.length) : 0,
      produtosEstoqueBaixo: this.estoqueService.listarEstoqueBaixo().length,
      totalProdutosAtivos: this.estoqueService.listarProdutos().length,
    };
  }

  private adicionarAoCaixa(
    caixa: CaixaService,
    identificador: string,
    quantidade: number,
  ): ItemCarrinho {
    const produto = this.estoqueService.consultarProduto(identificador);
    return caixa.adicionarItem(produto.nome, produto.preco, quantidade, produto.sku);
  }

  private montarCaixa(pedido: SimularCaixaRequest): CaixaService {
    const itens = this.validarItens(pedido?.itens);
    const caixa = new CaixaService();

    for (const item of itens) {
      this.adicionarAoCaixa(caixa, item.sku, item.quantidade);
    }

    if (pedido.cupom !== undefined && pedido.cupom !== null && pedido.cupom !== '') {
      if (typeof pedido.cupom !== 'string') {
        throw new ValidacaoError('Cupom deve ser um texto');
      }
      caixa.aplicarCupom(pedido.cupom);
    }

    return caixa;
  }

  private validarItens(itens: unknown): ItemPedidoInput[] {
    if (!Array.isArray(itens) || itens.length === 0) {
      throw new ValidacaoError('Informe ao menos um item no pedido');
    }

    for (const item of itens as Partial<ItemPedidoInput>[]) {
      if (!item || typeof item.sku !== 'string' || !item.sku.trim()) {
        throw new ValidacaoError('Cada item do pedido deve ter um SKU');
      }
      if (!Number.isInteger(item.quantidade) || (item.quantidade as number) <= 0) {
        throw new ValidacaoError(
          `Quantidade inválida para o SKU "${item.sku}": use um inteiro maior que zero`,
        );
      }
    }

    return itens as ItemPedidoInput[];
  }

  private fecharVenda(caixa: CaixaService, pagamento?: PagamentoInput): ReciboVenda {
    const itens = caixa.listarItens();
    if (itens.length === 0) {
      throw new ValidacaoError(
        'Não é possível finalizar a compra com o carrinho vazio',
      );
    }

    // Validação prévia de todos os itens antes de qualquer baixa garante rollback atômico.
    for (const item of itens) {
      this.estoqueService.verificarDisponibilidade(item.sku ?? item.nome, item.quantidade);
    }

    const resumo = caixa.calcularResumo();
    const pagamentoCalculado = pagamento ? caixa.calcularPagamento(pagamento) : undefined;

    for (const item of itens) {
      this.estoqueService.baixarEstoque(item.sku ?? item.nome, item.quantidade);
    }

    const recibo: ReciboVenda = {
      id: randomUUID(),
      data: new Date().toISOString(),
      status: 'CONCLUIDA',
      ...resumo,
      ...(pagamentoCalculado
        ? {
            formaPagamento: pagamentoCalculado.formaPagamento,
            valorPago: pagamentoCalculado.valorPago,
            troco: pagamentoCalculado.troco,
          }
        : {}),
    };

    return this.vendaRepository.registrar(recibo);
  }
}
