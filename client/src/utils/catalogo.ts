import type { CategoriaProduto, Produto } from '../../../src/shared/contracts';

export interface FiltroCatalogo {
  busca?: string;
  categoria?: CategoriaProduto | '';
  apenasEstoqueBaixo?: boolean;
}

function normalizar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

export function ehEstoqueBaixo(produto: Pick<Produto, 'quantidade' | 'estoqueMinimo'>): boolean {
  return produto.quantidade <= produto.estoqueMinimo;
}

export function filtrarCatalogo(produtos: readonly Produto[], filtro: FiltroCatalogo = {}): Produto[] {
  const termo = normalizar(filtro.busca ?? '');

  return produtos.filter((produto) => {
    if (termo && !normalizar(`${produto.nome} ${produto.sku}`).includes(termo)) {
      return false;
    }
    if (filtro.categoria && produto.categoria !== filtro.categoria) {
      return false;
    }
    if (filtro.apenasEstoqueBaixo && !ehEstoqueBaixo(produto)) {
      return false;
    }
    return true;
  });
}
