import { Produto } from '../shared/contracts.js';

export interface IProdutoRepository {
  salvar(produto: Produto): Produto;
  atualizar(produto: Produto): Produto;
  buscarPorSku(sku: string): Produto | null;
  buscarPorNome(nome: string): Produto | null;
  listarTodos(): Produto[];
  remover(sku: string): boolean;
}
