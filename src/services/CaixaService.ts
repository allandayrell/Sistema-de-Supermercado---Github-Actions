import {
  CupomInfo,
  CupomInvalidoError,
  ItemCarrinho,
  ProdutoNaoEncontradoError,
  ResumoCaixa,
  ValidacaoError,
} from '../models/types.js';

const CUPONS_DISPONIVEIS: Readonly<Record<string, CupomInfo>> = {
  DESC10: {
    codigo: 'DESC10',
    tipo: 'PERCENTUAL',
    valor: 0.1,
    valorMinimo: 0,
  },
  HORIZONTE15: {
    codigo: 'HORIZONTE15',
    tipo: 'FIXO',
    valor: 15,
    valorMinimo: 100,
  },
};

const LIMITE_DESCONTO_EXTRA = 200;
const TAXA_DESCONTO_EXTRA = 0.05;

function arredondarMoeda(valor: number): number {
  return Math.round((valor + Number.EPSILON) * 100) / 100;
}

export class CaixaService {
  private readonly itens = new Map<string, ItemCarrinho>();
  private cupomAtual: string | null = null;

  private normalizarChave(nome: string): string {
    return nome.trim().toLowerCase();
  }

  private buscarChaveItem(identificador: string): string | null {
    const chaveDireta = this.normalizarChave(identificador);
    if (this.itens.has(chaveDireta)) {
      return chaveDireta;
    }

    const skuAlvo = identificador.trim().toUpperCase();
    for (const [chave, item] of this.itens.entries()) {
      if (item.sku && item.sku.toUpperCase() === skuAlvo) {
        return chave;
      }
    }

    return null;
  }

  adicionarItem(
    nome: string,
    precoUnitario: number,
    quantidade: number,
    sku?: string,
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
      ...(sku ? { sku: sku.trim().toUpperCase() } : {}),
    };

    this.itens.set(chave, novoItem);
    return { ...novoItem };
  }

  atualizarQuantidade(identificador: string, novaQuantidade: number): ItemCarrinho {
    if (!Number.isInteger(novaQuantidade) || novaQuantidade <= 0) {
      throw new ValidacaoError('Quantidade do item deve ser maior que zero');
    }

    const chave = this.buscarChaveItem(identificador);
    if (!chave) {
      throw new ProdutoNaoEncontradoError(identificador);
    }

    const item = this.itens.get(chave)!;
    item.quantidade = novaQuantidade;
    return { ...item };
  }

  removerItem(identificador: string): boolean {
    const chave = this.buscarChaveItem(identificador);
    if (!chave) {
      return false;
    }
    return this.itens.delete(chave);
  }

  listarItens(): ItemCarrinho[] {
    return Array.from(this.itens.values(), (item) => ({ ...item }));
  }

  listarCuponsDisponiveis(): CupomInfo[] {
    return Object.values(CUPONS_DISPONIVEIS).map((cupom) => ({ ...cupom }));
  }

  aplicarCupom(codigo: string): void {
    const codigoNormalizado = codigo.trim().toUpperCase();
    const cupom = codigoNormalizado ? CUPONS_DISPONIVEIS[codigoNormalizado] : undefined;

    if (!cupom) {
      throw new CupomInvalidoError(codigo);
    }

    const subtotal = this.calcularSubtotal();
    if (subtotal < cupom.valorMinimo) {
      throw new CupomInvalidoError(
        codigoNormalizado,
        `subtotal mínimo de R$ ${cupom.valorMinimo.toFixed(2)} não atingido`,
      );
    }

    this.cupomAtual = codigoNormalizado;
  }

  removerCupom(): void {
    this.cupomAtual = null;
  }

  calcularSubtotal(): number {
    let soma = 0;
    for (const item of this.itens.values()) {
      soma += item.precoUnitario * item.quantidade;
    }
    return arredondarMoeda(soma);
  }

  calcularResumo(): ResumoCaixa {
    const subtotal = this.calcularSubtotal();
    const cupom = this.cupomAtual ? CUPONS_DISPONIVEIS[this.cupomAtual] : undefined;
    const cupomElegivel = cupom !== undefined && subtotal >= cupom.valorMinimo;

    let descontoCupom = 0;
    if (cupomElegivel) {
      descontoCupom =
        cupom.tipo === 'PERCENTUAL'
          ? arredondarMoeda(subtotal * cupom.valor)
          : arredondarMoeda(Math.min(subtotal, cupom.valor));
    }

    const descontoExtra =
      subtotal > LIMITE_DESCONTO_EXTRA
        ? arredondarMoeda(subtotal * TAXA_DESCONTO_EXTRA)
        : 0;
    const totalDesconto = arredondarMoeda(descontoCupom + descontoExtra);
    const totalFinal = arredondarMoeda(Math.max(0, subtotal - totalDesconto));

    return {
      itens: this.listarItens(),
      subtotal,
      cupomAplicado: cupomElegivel ? this.cupomAtual : null,
      descontoCupom,
      descontoExtra,
      totalDesconto,
      totalFinal,
    };
  }

  limparCarrinho(): void {
    this.itens.clear();
    this.cupomAtual = null;
  }
}
