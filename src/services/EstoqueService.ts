import {
  EstoqueInsuficienteError,
  Produto,
  ProdutoNaoEncontradoError,
  ValidacaoError,
} from '../models/types.js';

/**
 * Gerencia o catálogo e o saldo de estoque dos produtos em memória.
 */
export class EstoqueService {
  private readonly produtos = new Map<string, Produto>();

  private normalizarChave(nome: string): string {
    return nome.trim().toLowerCase();
  }

  private validarQuantidadePositiva(quantidade: number, contexto: string): void {
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new ValidacaoError(
        `${contexto}: a quantidade deve ser um número inteiro maior que zero`,
      );
    }
  }

  /**
   * Cadastra um novo produto no estoque após validar nome, preço e quantidade.
   */
  cadastrarProduto(nome: string, preco: number, quantidade: number): Produto {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      throw new ValidacaoError('Nome do produto é obrigatório');
    }

    if (!Number.isFinite(preco) || preco < 0) {
      throw new ValidacaoError('Preço do produto não pode ser negativo');
    }

    this.validarQuantidadePositiva(quantidade, 'Cadastro de produto');

    const chave = this.normalizarChave(nomeLimpo);
    if (this.produtos.has(chave)) {
      throw new ValidacaoError(`Produto "${nomeLimpo}" já está cadastrado`);
    }

    const produto: Produto = {
      nome: nomeLimpo,
      preco: Number(preco.toFixed(2)),
      quantidade,
    };

    this.produtos.set(chave, produto);
    return { ...produto };
  }

  /**
   * Retorna uma cópia dos dados do produto pelo nome.
   */
  consultarProduto(nome: string): Produto {
    const chave = this.normalizarChave(nome);
    const produto = this.produtos.get(chave);
    if (!produto) {
      throw new ProdutoNaoEncontradoError(nome);
    }
    return { ...produto };
  }

  /**
   * Lista todos os produtos cadastrados no estoque.
   */
  listarProdutos(): Produto[] {
    return Array.from(this.produtos.values(), (produto) => ({ ...produto }));
  }

  /**
   * Verifica se há saldo suficiente em estoque para a quantidade solicitada.
   */
  verificarDisponibilidade(nome: string, quantidade: number): void {
    this.validarQuantidadePositiva(quantidade, 'Consulta de estoque');
    const chave = this.normalizarChave(nome);
    const produto = this.produtos.get(chave);

    if (!produto) {
      throw new ProdutoNaoEncontradoError(nome);
    }

    if (quantidade > produto.quantidade) {
      throw new EstoqueInsuficienteError(
        produto.nome,
        quantidade,
        produto.quantidade,
      );
    }
  }

  /**
   * Deduz a quantidade vendida do saldo do produto, impedindo estoque negativo.
   */
  baixarEstoque(nome: string, quantidade: number): Produto {
    this.verificarDisponibilidade(nome, quantidade);
    const chave = this.normalizarChave(nome);
    const produto = this.produtos.get(chave)!;

    produto.quantidade -= quantidade;
    return { ...produto };
  }

  /**
   * Adiciona unidades ao estoque de um produto já cadastrado.
   */
  reporEstoque(nome: string, quantidade: number): Produto {
    this.validarQuantidadePositiva(quantidade, 'Reposição de estoque');
    const chave = this.normalizarChave(nome);
    const produto = this.produtos.get(chave);

    if (!produto) {
      throw new ProdutoNaoEncontradoError(nome);
    }

    produto.quantidade += quantidade;
    return { ...produto };
  }
}
