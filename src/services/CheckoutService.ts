import { randomUUID } from 'node:crypto';
import {
  ItemCarrinho,
  ReciboVenda,
  ValidacaoError,
} from '../models/types.js';
import { InMemoryVendaRepository } from '../repositories/InMemoryVendaRepository.js';
import { IVendaRepository } from '../repositories/IVendaRepository.js';
import { CaixaService } from './CaixaService.js';
import { EstoqueService } from './EstoqueService.js';

export class CheckoutService {
  constructor(
    private readonly estoqueService: EstoqueService,
    private readonly caixaService: CaixaService,
    private readonly vendaRepository: IVendaRepository = new InMemoryVendaRepository(),
  ) {}

  adicionarProdutoAoCarrinho(identificador: string, quantidade: number): ItemCarrinho {
    const produto = this.estoqueService.consultarProduto(identificador);
    return this.caixaService.adicionarItem(
      produto.nome,
      produto.preco,
      quantidade,
    );
  }

  finalizarCompra(): ReciboVenda {
    const itens = this.caixaService.listarItens();
    if (itens.length === 0) {
      throw new ValidacaoError(
        'Não é possível finalizar a compra com o carrinho vazio',
      );
    }

    // Validação prévia de todos os itens antes de qualquer baixa garante rollback atômico.
    for (const item of itens) {
      this.estoqueService.verificarDisponibilidade(item.nome, item.quantidade);
    }

    const resumo = this.caixaService.calcularResumo();

    for (const item of itens) {
      this.estoqueService.baixarEstoque(item.nome, item.quantidade);
    }

    const recibo: ReciboVenda = {
      id: randomUUID(),
      data: new Date().toISOString(),
      status: 'CONCLUIDA',
      ...resumo,
    };

    const registrado = this.vendaRepository.registrar(recibo);
    this.caixaService.limparCarrinho();
    return registrado;
  }
}
