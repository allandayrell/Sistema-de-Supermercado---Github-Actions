import { Produto } from '../shared/contracts.js';
import { IProdutoRepository } from './IProdutoRepository.js';

export class InMemoryProdutoRepository implements IProdutoRepository {
  private readonly produtos = new Map<string, Produto>();

  private normalizarSku(sku: string): string {
    return sku.trim().toUpperCase();
  }

  private normalizarNome(nome: string): string {
    return nome.trim().toLowerCase();
  }

  salvar(produto: Produto): Produto {
    const copia: Produto = {
      ...produto,
      sku: this.normalizarSku(produto.sku),
    };
    this.produtos.set(copia.sku, copia);
    return { ...copia };
  }

  atualizar(produto: Produto): Produto {
    return this.salvar(produto);
  }

  buscarPorSku(sku: string): Produto | null {
    const encontrado = this.produtos.get(this.normalizarSku(sku));
    return encontrado ? { ...encontrado } : null;
  }

  buscarPorNome(nome: string): Produto | null {
    const alvo = this.normalizarNome(nome);
    for (const produto of this.produtos.values()) {
      if (this.normalizarNome(produto.nome) === alvo) {
        return { ...produto };
      }
    }
    return null;
  }

  listarTodos(): Produto[] {
    return Array.from(this.produtos.values(), (produto) => ({ ...produto }));
  }

  remover(sku: string): boolean {
    return this.produtos.delete(this.normalizarSku(sku));
  }
}
