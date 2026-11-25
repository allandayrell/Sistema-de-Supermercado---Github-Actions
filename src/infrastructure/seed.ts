import { CadastroProdutoInput } from '../shared/contracts.js';
import { EstoqueService } from '../services/EstoqueService.js';

export const PRODUTOS_SEED_MERCADO_HORIZONTE: readonly CadastroProdutoInput[] = [
  {
    sku: 'MER-001',
    nome: 'Arroz Tipo 1 (5kg)',
    categoria: 'Mercearia',
    preco: 26.9,
    quantidade: 24,
    estoqueMinimo: 8,
  },
  {
    sku: 'MER-002',
    nome: 'Feijão Carioca (1kg)',
    categoria: 'Mercearia',
    preco: 8.9,
    quantidade: 18,
    estoqueMinimo: 6,
  },
  {
    sku: 'BEB-001',
    nome: 'Café Gourmet Torrado (500g)',
    categoria: 'Bebidas',
    preco: 34.5,
    quantidade: 12,
    estoqueMinimo: 5,
  },
  {
    sku: 'LAT-001',
    nome: 'Leite Integral (1L)',
    categoria: 'Laticínios',
    preco: 5.4,
    quantidade: 30,
    estoqueMinimo: 10,
  },
  {
    sku: 'MER-003',
    nome: 'Azeite Extra Virgem (500ml)',
    categoria: 'Mercearia',
    preco: 42.0,
    quantidade: 4,
    estoqueMinimo: 5,
  },
  {
    sku: 'PAD-001',
    nome: 'Pão de Forma Tradicional',
    categoria: 'Padaria',
    preco: 9.2,
    quantidade: 14,
    estoqueMinimo: 5,
  },
  {
    sku: 'HOR-001',
    nome: 'Banana Prata (kg)',
    categoria: 'Hortifruti',
    preco: 6.8,
    quantidade: 3,
    estoqueMinimo: 6,
  },
  {
    sku: 'LIM-001',
    nome: 'Detergente Neutro (500ml)',
    categoria: 'Limpeza',
    preco: 2.9,
    quantidade: 40,
    estoqueMinimo: 10,
  },
];

export function popularCatalogoInicial(estoque: EstoqueService): void {
  for (const item of PRODUTOS_SEED_MERCADO_HORIZONTE) {
    if (!estoque.existeProduto(item.sku ?? item.nome)) {
      estoque.cadastrarProduto(item.nome, item.preco, item.quantidade, {
        sku: item.sku,
        categoria: item.categoria,
        estoqueMinimo: item.estoqueMinimo,
      });
    }
  }
}
