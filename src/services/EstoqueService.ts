import {
  CATEGORIAS_PRODUTO,
  CategoriaProduto,
  EstoqueInsuficienteError,
  FiltroProdutos,
  Produto,
  ProdutoNaoEncontradoError,
  ValidacaoError,
} from '../models/types.js';
import { IProdutoRepository } from '../repositories/IProdutoRepository.js';
import { InMemoryProdutoRepository } from '../repositories/InMemoryProdutoRepository.js';

export interface OpcoesCadastroProduto {
  sku?: string;
  categoria?: CategoriaProduto;
  estoqueMinimo?: number;
}

export class EstoqueService {
  constructor(
    private readonly repository: IProdutoRepository = new InMemoryProdutoRepository(),
  ) {}

  private validarQuantidadePositiva(quantidade: number, contexto: string): void {
    if (!Number.isInteger(quantidade) || quantidade <= 0) {
      throw new ValidacaoError(
        `${contexto}: a quantidade deve ser um número inteiro maior que zero`,
      );
    }
  }

  private gerarSkuPadrao(nomeLimpo: string): string {
    const slug = nomeLimpo
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const base = `SKU-${slug || 'ITEM'}`;
    if (!this.repository.buscarPorSku(base)) {
      return base;
    }

    let sufixo = 2;
    while (this.repository.buscarPorSku(`${base}-${sufixo}`)) {
      sufixo += 1;
    }
    return `${base}-${sufixo}`;
  }

  private buscarExistente(identificador: string): Produto | null {
    return (
      this.repository.buscarPorSku(identificador) ??
      this.repository.buscarPorNome(identificador)
    );
  }

  existeProduto(identificador: string): boolean {
    return this.buscarExistente(identificador) !== null;
  }

  cadastrarProduto(
    nome: string,
    preco: number,
    quantidade: number,
    opcoes: OpcoesCadastroProduto = {},
  ): Produto {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      throw new ValidacaoError('Nome do produto é obrigatório');
    }

    if (!Number.isFinite(preco) || preco < 0) {
      throw new ValidacaoError('Preço do produto não pode ser negativo');
    }

    this.validarQuantidadePositiva(quantidade, 'Cadastro de produto');

    const estoqueMinimo = opcoes.estoqueMinimo ?? 5;
    if (!Number.isInteger(estoqueMinimo) || estoqueMinimo < 0) {
      throw new ValidacaoError('Estoque mínimo deve ser um inteiro maior ou igual a zero');
    }

    if (this.repository.buscarPorNome(nomeLimpo)) {
      throw new ValidacaoError(`Produto "${nomeLimpo}" já está cadastrado`);
    }

    const sku = opcoes.sku?.trim().toUpperCase() || this.gerarSkuPadrao(nomeLimpo);
    if (this.repository.buscarPorSku(sku)) {
      throw new ValidacaoError(`SKU "${sku}" já está cadastrado`);
    }

    const categoria = opcoes.categoria ?? 'Outros';
    if (!CATEGORIAS_PRODUTO.includes(categoria)) {
      throw new ValidacaoError(`Categoria "${categoria}" inválida`);
    }

    const produto: Produto = {
      sku,
      nome: nomeLimpo,
      categoria,
      preco: Number(preco.toFixed(2)),
      quantidade,
      estoqueMinimo,
      ativo: true,
    };

    return this.repository.salvar(produto);
  }

  consultarProduto(identificador: string): Produto {
    const produto = this.buscarExistente(identificador);
    if (!produto) {
      throw new ProdutoNaoEncontradoError(identificador);
    }
    return produto;
  }

  listarProdutos(filtro: FiltroProdutos = {}): Produto[] {
    const busca = filtro.busca?.trim().toLowerCase();

    return this.repository.listarTodos().filter((produto) => {
      if (!filtro.incluirInativos && !produto.ativo) {
        return false;
      }
      if (filtro.categoria && produto.categoria !== filtro.categoria) {
        return false;
      }
      if (
        busca &&
        !produto.nome.toLowerCase().includes(busca) &&
        !produto.sku.toLowerCase().includes(busca)
      ) {
        return false;
      }
      if (
        filtro.apenasEstoqueBaixo &&
        produto.quantidade > produto.estoqueMinimo
      ) {
        return false;
      }
      return true;
    });
  }

  listarEstoqueBaixo(): Produto[] {
    return this.listarProdutos({ apenasEstoqueBaixo: true });
  }

  verificarDisponibilidade(identificador: string, quantidade: number): void {
    this.validarQuantidadePositiva(quantidade, 'Consulta de estoque');
    const produto = this.buscarExistente(identificador);

    if (!produto) {
      throw new ProdutoNaoEncontradoError(identificador);
    }

    if (quantidade > produto.quantidade) {
      throw new EstoqueInsuficienteError(
        produto.nome,
        quantidade,
        produto.quantidade,
      );
    }
  }

  baixarEstoque(identificador: string, quantidade: number): Produto {
    this.verificarDisponibilidade(identificador, quantidade);
    const produto = this.buscarExistente(identificador)!;
    produto.quantidade -= quantidade;
    return this.repository.atualizar(produto);
  }

  reporEstoque(identificador: string, quantidade: number): Produto {
    this.validarQuantidadePositiva(quantidade, 'Reposição de estoque');
    const produto = this.buscarExistente(identificador);

    if (!produto) {
      throw new ProdutoNaoEncontradoError(identificador);
    }

    produto.quantidade += quantidade;
    return this.repository.atualizar(produto);
  }

  atualizarPreco(identificador: string, novoPreco: number): Produto {
    if (!Number.isFinite(novoPreco) || novoPreco < 0) {
      throw new ValidacaoError('Preço do produto não pode ser negativo');
    }

    const produto = this.buscarExistente(identificador);
    if (!produto) {
      throw new ProdutoNaoEncontradoError(identificador);
    }

    produto.preco = Number(novoPreco.toFixed(2));
    return this.repository.atualizar(produto);
  }

  removerProduto(identificador: string): boolean {
    const produto = this.buscarExistente(identificador);
    if (!produto) {
      throw new ProdutoNaoEncontradoError(identificador);
    }

    return this.repository.remover(produto.sku);
  }
}
