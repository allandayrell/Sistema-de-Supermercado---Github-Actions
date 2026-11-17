import {
  CupomInvalidoError,
  ItemCarrinho,
  ResumoCaixa,
  ValidacaoError,
} from '../models/types.js';

const CUPONS_VALIDOS: Readonly<Record<string, number>> = {
  DESC10: 0.1,
};

const LIMITE_DESCONTO_EXTRA = 200;
const TAXA_DESCONTO_EXTRA = 0.05;

function arredondarMoeda(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

/**
 * Gerencia o carrinho de compras, cupons de desconto e cálculo do caixa.
 */
export class CaixaService {
  private readonly itens = new Map<string, ItemCarrinho>();
  private cupomAtual: string | null = null;

  private normalizarChave(nome: string): string {
    return nome.trim().toLowerCase();
  }

  /**
   * Adiciona um item ao carrinho validando preço não negativo e quantidade positiva.
   */
  adicionarItem(
    nome: string,
    precoUnitario: number,
    quantidade: number,
  ): ItemCarrinho {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      throw new ValidacaoError('Nome do item é obrigatório');
    }

    if (!Number.isFinite(precoUnitario) || precoUnitario < 0) {
      throw new ValidacaoError('Preço do produto não pode ser negativo');
    }

    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new ValidacaoError('Quantidade do item deve ser maior que zero');
    }

    const chave = this.normalizarChave(nomeLimpo);
    const precoNormalizado = arredondarMoeda(precoUnitario);
    const existente = this.itens.get(chave);

    if (existente) {
      if (existente.precoUnitario !== precoNormalizado) {
        throw new ValidacaoError(
          `Conflito de preço para "${nomeLimpo}" no carrinho`,
        );
      }
      existente.quantidade += quantidade;
      return { ...existente };
    }

    const novoItem: ItemCarrinho = {
      nome: nomeLimpo,
      precoUnitario: precoNormalizado,
      quantidade,
    };

    this.itens.set(chave, novoItem);
    return { ...novoItem };
  }

  /**
   * Remove um item do carrinho pelo nome.
   */
  removerItem(nome: string): boolean {
    return this.itens.delete(this.normalizarChave(nome));
  }

  /**
   * Retorna uma cópia da lista de itens atualmente no carrinho.
   */
  listarItens(): ItemCarrinho[] {
    return Array.from(this.itens.values(), (item) => ({ ...item }));
  }

  /**
   * Aplica um cupom promocional válido (ex: DESC10 para 10% de desconto).
   */
  aplicarCupom(codigo: string): void {
    const codigoNormalizado = codigo.trim().toUpperCase();
    if (!codigoNormalizado || !(codigoNormalizado in CUPONS_VALIDOS)) {
      throw new CupomInvalidoError(codigo);
    }
    this.cupomAtual = codigoNormalizado;
  }

  /**
   * Remove qualquer cupom aplicado no carrinho.
   */
  removerCupom(): void {
    this.cupomAtual = null;
  }

  /**
   * Calcula o subtotal bruto dos itens do carrinho antes dos descontos.
   */
  calcularSubtotal(): number {
    let soma = 0;
    for (const item of this.itens.values()) {
      soma += item.precoUnitario * item.quantidade;
    }
    return arredondarMoeda(soma);
  }

  /**
   * Calcula o resumo completo com cupom e bônus de 5% acima de R$ 200.
   */
  calcularResumo(): ResumoCaixa {
    const subtotal = this.calcularSubtotal();
    const taxaCupom = this.cupomAtual ? CUPONS_VALIDOS[this.cupomAtual] : 0;
    const descontoCupom = arredondarMoeda(subtotal * taxaCupom);
    const descontoExtra =
      subtotal > LIMITE_DESCONTO_EXTRA
        ? arredondarMoeda(subtotal * TAXA_DESCONTO_EXTRA)
        : 0;
    const totalDesconto = arredondarMoeda(descontoCupom + descontoExtra);
    const totalFinal = arredondarMoeda(Math.max(0, subtotal - totalDesconto));

    return {
      itens: this.listarItens(),
      subtotal,
      cupomAplicado: this.cupomAtual,
      descontoCupom,
      descontoExtra,
      totalDesconto,
      totalFinal,
    };
  }

  /**
   * Esvazia o carrinho e remove o cupom aplicado.
   */
  limparCarrinho(): void {
    this.itens.clear();
    this.cupomAtual = null;
  }
}
