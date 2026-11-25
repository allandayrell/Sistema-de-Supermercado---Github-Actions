import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { Produto, ReciboVenda } from '../shared/contracts.js';
import { IProdutoRepository } from './IProdutoRepository.js';
import { IVendaRepository } from './IVendaRepository.js';

function lerJson<T>(caminho: string, padrao: T): T {
  if (!existsSync(caminho)) {
    return padrao;
  }
  const conteudo = readFileSync(caminho, 'utf8').trim();
  if (!conteudo) {
    return padrao;
  }
  return JSON.parse(conteudo) as T;
}

function gravarJson(caminho: string, dados: unknown): void {
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, JSON.stringify(dados, null, 2), 'utf8');
}

export class JsonProdutoRepository implements IProdutoRepository {
  constructor(private readonly caminhoArquivo: string) {}

  private carregarLista(): Produto[] {
    return lerJson<Produto[]>(this.caminhoArquivo, []);
  }

  salvar(produto: Produto): Produto {
    const lista = this.carregarLista();
    const skuNormalizado = produto.sku.trim().toUpperCase();
    const copia: Produto = { ...produto, sku: skuNormalizado };
    const indice = lista.findIndex(
      (item) => item.sku.trim().toUpperCase() === skuNormalizado,
    );

    if (indice >= 0) {
      lista[indice] = copia;
    } else {
      lista.push(copia);
    }

    gravarJson(this.caminhoArquivo, lista);
    return { ...copia };
  }

  atualizar(produto: Produto): Produto {
    return this.salvar(produto);
  }

  buscarPorSku(sku: string): Produto | null {
    const alvo = sku.trim().toUpperCase();
    const encontrado = this.carregarLista().find(
      (item) => item.sku.trim().toUpperCase() === alvo,
    );
    return encontrado ? { ...encontrado } : null;
  }

  buscarPorNome(nome: string): Produto | null {
    const alvo = nome.trim().toLowerCase();
    const encontrado = this.carregarLista().find(
      (item) => item.nome.trim().toLowerCase() === alvo,
    );
    return encontrado ? { ...encontrado } : null;
  }

  listarTodos(): Produto[] {
    return this.carregarLista().map((item) => ({ ...item }));
  }

  remover(sku: string): boolean {
    const alvo = sku.trim().toUpperCase();
    const lista = this.carregarLista();
    const filtrada = lista.filter(
      (item) => item.sku.trim().toUpperCase() !== alvo,
    );

    if (filtrada.length === lista.length) {
      return false;
    }

    gravarJson(this.caminhoArquivo, filtrada);
    return true;
  }
}

function clonarVenda(venda: ReciboVenda): ReciboVenda {
  return {
    ...venda,
    itens: venda.itens.map((item) => ({ ...item })),
  };
}

export class JsonVendaRepository implements IVendaRepository {
  constructor(private readonly caminhoArquivo: string) {}

  private carregarLista(): ReciboVenda[] {
    return lerJson<ReciboVenda[]>(this.caminhoArquivo, []);
  }

  registrar(venda: ReciboVenda): ReciboVenda {
    const lista = this.carregarLista();
    const copia = clonarVenda(venda);
    const indice = lista.findIndex((item) => item.id === copia.id);

    if (indice >= 0) {
      lista[indice] = copia;
    } else {
      lista.push(copia);
    }

    gravarJson(this.caminhoArquivo, lista);
    return clonarVenda(copia);
  }

  atualizar(venda: ReciboVenda): ReciboVenda {
    return this.registrar(venda);
  }

  buscarPorId(id: string): ReciboVenda | null {
    const encontrada = this.carregarLista().find((item) => item.id === id);
    return encontrada ? clonarVenda(encontrada) : null;
  }

  listarTodas(): ReciboVenda[] {
    return this.carregarLista().map(clonarVenda);
  }
}
