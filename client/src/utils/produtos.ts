import type {
  CadastroProdutoInput,
  CategoriaProduto,
  Produto,
} from '../../../src/shared/contracts';

export interface CamposCadastroProduto {
  sku: string;
  nome: string;
  categoria: CategoriaProduto;
  preco: string;
  quantidade: string;
  estoqueMinimo: string;
}

export type ResultadoCadastro =
  | { valido: true; dados: CadastroProdutoInput }
  | { valido: false; mensagem: string };

function lerDecimalNaoNegativo(texto: string): number | null {
  const normalizado = texto.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(normalizado)) {
    return null;
  }

  const valor = Number(normalizado);
  return Number.isFinite(valor) ? valor : null;
}

function lerInteiro(texto: string, minimo: number): number | null {
  const valor = Number(texto);
  if (!Number.isInteger(valor) || valor < minimo) {
    return null;
  }
  return valor;
}

export function validarCadastroProduto(campos: CamposCadastroProduto): ResultadoCadastro {
  const nome = campos.nome.trim();
  if (!nome) {
    return { valido: false, mensagem: 'Informe o nome do produto.' };
  }

  const preco = lerDecimalNaoNegativo(campos.preco);
  if (preco === null) {
    return {
      valido: false,
      mensagem: 'Informe um preço válido, com no máximo duas casas decimais.',
    };
  }

  const quantidade = lerInteiro(campos.quantidade, 1);
  if (quantidade === null) {
    return {
      valido: false,
      mensagem: 'A quantidade inicial deve ser um inteiro maior que zero.',
    };
  }

  const estoqueMinimo = lerInteiro(campos.estoqueMinimo, 0);
  if (estoqueMinimo === null) {
    return {
      valido: false,
      mensagem: 'O estoque mínimo deve ser um inteiro maior ou igual a zero.',
    };
  }

  const sku = campos.sku.trim().toUpperCase();
  return {
    valido: true,
    dados: {
      ...(sku ? { sku } : {}),
      nome,
      categoria: campos.categoria,
      preco,
      quantidade,
      estoqueMinimo,
    },
  };
}

export function substituirProduto(
  produtos: readonly Produto[],
  atualizado: Produto,
): Produto[] {
  const existe = produtos.some((produto) => produto.sku === atualizado.sku);
  if (!existe) {
    return [...produtos, atualizado];
  }

  return produtos.map((produto) =>
    produto.sku === atualizado.sku ? atualizado : produto,
  );
}

export function ordenarProdutos(produtos: readonly Produto[]): Produto[] {
  return [...produtos].sort((a, b) =>
    a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' }),
  );
}
