export const CATEGORIAS_PRODUTO = [
  'Mercearia',
  'Bebidas',
  'Laticínios',
  'Padaria',
  'Hortifruti',
  'Limpeza',
  'Higiene',
  'Outros',
] as const;

export type CategoriaProduto = (typeof CATEGORIAS_PRODUTO)[number];

export const FORMAS_PAGAMENTO = ['DINHEIRO', 'PIX', 'CARTAO'] as const;

export type FormaPagamento = (typeof FORMAS_PAGAMENTO)[number];

export type StatusVenda = 'CONCLUIDA' | 'ESTORNADA';

export interface Produto {
  sku: string;
  nome: string;
  categoria: CategoriaProduto;
  preco: number;
  quantidade: number;
  estoqueMinimo: number;
  ativo: boolean;
}

export interface CadastroProdutoInput {
  sku?: string;
  nome: string;
  categoria?: CategoriaProduto;
  preco: number;
  quantidade: number;
  estoqueMinimo?: number;
}

export interface FiltroProdutos {
  busca?: string;
  categoria?: CategoriaProduto;
  apenasEstoqueBaixo?: boolean;
  incluirInativos?: boolean;
}

export interface ItemCarrinho {
  sku?: string;
  nome: string;
  precoUnitario: number;
  quantidade: number;
}

export interface CupomInfo {
  codigo: string;
  tipo: 'PERCENTUAL' | 'FIXO';
  valor: number;
  valorMinimo: number;
}

export interface PagamentoInput {
  forma: FormaPagamento;
  valorRecebido?: number;
}

export interface ResumoCaixa {
  itens: ItemCarrinho[];
  subtotal: number;
  cupomAplicado: string | null;
  descontoCupom: number;
  descontoExtra: number;
  totalDesconto: number;
  totalFinal: number;
}

export interface ReciboVenda extends ResumoCaixa {
  id: string;
  data: string;
  status: StatusVenda;
  formaPagamento?: FormaPagamento;
  valorPago?: number;
  troco?: number;
  estornadaEm?: string;
}

export interface DashboardResumo {
  faturamentoLiquido: number;
  totalVendasConcluidas: number;
  totalVendasEstornadas: number;
  ticketMedio: number;
  produtosEstoqueBaixo: number;
  totalProdutosAtivos: number;
}

export interface ItemPedidoInput {
  sku: string;
  quantidade: number;
}

export interface SimularCaixaRequest {
  itens: ItemPedidoInput[];
  cupom?: string;
}

export interface CheckoutRequest {
  itens: ItemPedidoInput[];
  cupom?: string;
  pagamento: PagamentoInput;
}

export interface ApiErrorResponse {
  erro: string;
  codigo: string;
}
