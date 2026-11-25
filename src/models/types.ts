export * from '../shared/contracts.js';

export class ValidacaoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidacaoError';
  }
}

export class EstoqueInsuficienteError extends Error {
  constructor(nome: string, solicitado: number, disponivel: number) {
    super(
      `Estoque insuficiente para "${nome}": solicitado ${solicitado}, disponível ${disponivel}`,
    );
    this.name = 'EstoqueInsuficienteError';
  }
}

export class ProdutoNaoEncontradoError extends Error {
  constructor(identificador: string) {
    super(`Produto "${identificador}" não encontrado no estoque`);
    this.name = 'ProdutoNaoEncontradoError';
  }
}

export class CupomInvalidoError extends Error {
  constructor(codigo: string, motivo?: string) {
    super(motivo ? `Cupom "${codigo}" inválido: ${motivo}` : `Cupom "${codigo}" inválido`);
    this.name = 'CupomInvalidoError';
  }
}

export class VendaNaoEncontradaError extends Error {
  constructor(id: string) {
    super(`Venda "${id}" não encontrada`);
    this.name = 'VendaNaoEncontradaError';
  }
}

export class VendaJaEstornadaError extends Error {
  constructor(id: string) {
    super(`Venda "${id}" já foi estornada`);
    this.name = 'VendaJaEstornadaError';
  }
}

export class PagamentoInsuficienteError extends Error {
  constructor(recebido: number, total: number) {
    super(
      `Valor recebido (R$ ${recebido.toFixed(2)}) é menor que o total da compra (R$ ${total.toFixed(2)})`,
    );
    this.name = 'PagamentoInsuficienteError';
  }
}
