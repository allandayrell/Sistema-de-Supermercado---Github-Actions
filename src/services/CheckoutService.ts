import { randomUUID } from 'node:crypto';
import {
  ItemCarrinho,
  ReciboVenda,
  ValidacaoError,
} from '../models/types.js';
import { CaixaService } from './CaixaService.js';
import { EstoqueService } from './EstoqueService.js';

/**
 * Orquestra o fechamento da compra integrando CaixaService e EstoqueService
 * com validação atômica para garantir rollback em caso de falta de estoque.
 */
export class CheckoutService {
  constructor(
    private readonly estoqueService: EstoqueService,
    private readonly caixaService: CaixaService,
  ) {}

  /**
   * Consulta o preço no estoque e adiciona o item desejado ao carrinho.
   */
  adicionarProdutoAoCarrinho(nome: string, quantidade: number): ItemCarrinho {
    const produto = this.estoqueService.consultarProduto(nome);
    return this.caixaService.adicionarItem(
      produto.nome,
      produto.preco,
      quantidade,
    );
  }

  /**
   * Valida disponibilidade de todos os itens, calcula descontos, baixa o estoque
   * e emite o recibo da venda. Se qualquer item falhar, nenhum estoque é alterado.
   */
  finalizarCompra(): ReciboVenda {
    const itens = this.caixaService.listarItens();
    if (itens.length === 0) {
      throw new ValidacaoError(
        'Não é possível finalizar a compra com o carrinho vazio',
      );
    }

    // Fase 1: validação prévia de todos os itens garante atomicidade (rollback).
    for (const item of itens) {
      this.estoqueService.verificarDisponibilidade(item.nome, item.quantidade);
    }

    // Fase 2: cálculo final dos valores com descontos.
    const resumo = this.caixaService.calcularResumo();

    // Fase 3: baixa efetiva no estoque após todas as validações passarem.
    for (const item of itens) {
      this.estoqueService.baixarEstoque(item.nome, item.quantidade);
    }

    // Fase 4: emissão do recibo e limpeza do carrinho para a próxima venda.
    const recibo: ReciboVenda = {
      id: randomUUID(),
      data: new Date().toISOString(),
      ...resumo,
    };

    this.caixaService.limparCarrinho();
    return recibo;
  }
}
