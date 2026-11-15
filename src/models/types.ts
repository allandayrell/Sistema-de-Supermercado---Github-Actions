/**
 * Representa um produto armazenado no catálogo/estoque do supermercado.
 */
export interface Produto {
  nome: string;
  preco: number;
  quantidade: number;
}

/**
 * Representa um item adicionado ao carrinho de compras.
 */
export interface ItemCarrinho {
  nome: string;
  precoUnitario: number;
  quantidade: number;
}

/**
 * Resumo financeiro calculado pelo CaixaService.
 */
export interface ResumoCaixa {
  itens: ItemCarrinho[];
  subtotal: number;
  cupomAplicado: string | null;
  descontoCupom: number;
  descontoExtra: number;
  totalDesconto: number;
  totalFinal: number;
}

/**
 * Recibo emitido após o fechamento bem-sucedido de um pedido.
 */
export interface ReciboVenda extends ResumoCaixa {
  id: string;
  data: string;
}

/**
 * Erro lançado quando um dado de entrada viola uma regra de validação.
 */
export class ValidacaoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidacaoError';
  }
}

/**
 * Erro lançado quando a quantidade solicitada excede o estoque disponível.
 */
export class EstoqueInsuficienteError extends Error {
  constructor(nome: string, solicitado: number, disponivel: number) {
    super(
      `Estoque insuficiente para "${nome}": solicitado ${solicitado}, disponível ${disponivel}`,
    );
    this.name = 'EstoqueInsuficienteError';
  }
}

/**
 * Erro lançado ao buscar ou operar sobre um produto inexistente no estoque.
 */
export class ProdutoNaoEncontradoError extends Error {
  constructor(nome: string) {
    super(`Produto "${nome}" não encontrado no estoque`);
    this.name = 'ProdutoNaoEncontradoError';
  }
}

/**
 * Erro lançado quando o cupom informado não é válido.
 */
export class CupomInvalidoError extends Error {
  constructor(codigo: string) {
    super(`Cupom "${codigo}" inválido`);
    this.name = 'CupomInvalidoError';
  }
}
