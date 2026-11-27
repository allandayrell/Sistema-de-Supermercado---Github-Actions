import type {
  ApiErrorResponse,
  CadastroProdutoInput,
  CheckoutRequest,
  DashboardResumo,
  Produto,
  ReciboVenda,
  ResumoCaixa,
  SimularCaixaRequest,
} from '../../../src/shared/contracts';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly codigo: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

function ehErroDaApi(corpo: unknown): corpo is ApiErrorResponse {
  return (
    typeof corpo === 'object' &&
    corpo !== null &&
    typeof (corpo as ApiErrorResponse).erro === 'string'
  );
}

async function requisitar<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(caminho, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
  } catch {
    throw new ApiError(
      'Não foi possível conectar ao servidor Mercado Horizonte',
      0,
      'SEM_CONEXAO',
    );
  }

  if (resposta.status === 204) {
    return undefined as T;
  }

  const corpo: unknown = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    if (ehErroDaApi(corpo)) {
      throw new ApiError(corpo.erro, resposta.status, corpo.codigo);
    }
    throw new ApiError(
      `Erro inesperado do servidor (HTTP ${resposta.status})`,
      resposta.status,
      'ERRO_HTTP',
    );
  }

  return corpo as T;
}

function enviarJson(method: string, corpo?: unknown): RequestInit {
  return corpo === undefined ? { method } : { method, body: JSON.stringify(corpo) };
}

export interface HealthStatus {
  status: string;
  service: string;
  produtosCadastrados: number;
}

const comprasPendentes = new Set<Promise<ReciboVenda>>();

export const api = {
  health: () => requisitar<HealthStatus>('/api/health'),

  listarProdutos: async () => {
    if (comprasPendentes.size > 0) {
      await Promise.allSettled(comprasPendentes);
    }
    return requisitar<Produto[]>('/api/produtos');
  },

  cadastrarProduto: (dados: CadastroProdutoInput) =>
    requisitar<Produto>('/api/produtos', enviarJson('POST', dados)),

  atualizarPreco: (sku: string, preco: number) =>
    requisitar<Produto>(
      `/api/produtos/${encodeURIComponent(sku)}`,
      enviarJson('PATCH', { preco }),
    ),

  reporEstoque: (sku: string, quantidade: number) =>
    requisitar<Produto>(
      `/api/produtos/${encodeURIComponent(sku)}/repor`,
      enviarJson('POST', { quantidade }),
    ),

  removerProduto: (sku: string) =>
    requisitar<void>(`/api/produtos/${encodeURIComponent(sku)}`, enviarJson('DELETE')),

  simularCaixa: (pedido: SimularCaixaRequest) =>
    requisitar<ResumoCaixa>('/api/caixa/simular', enviarJson('POST', pedido)),

  finalizarCompra: async (pedido: CheckoutRequest) => {
    const compra = requisitar<ReciboVenda>('/api/checkout', enviarJson('POST', pedido));
    comprasPendentes.add(compra);
    try {
      return await compra;
    } finally {
      comprasPendentes.delete(compra);
    }
  },

  listarVendas: () => requisitar<ReciboVenda[]>('/api/vendas'),

  estornarVenda: (id: string) =>
    requisitar<ReciboVenda>(
      `/api/vendas/${encodeURIComponent(id)}/estorno`,
      enviarJson('POST'),
    ),

  obterDashboard: () => requisitar<DashboardResumo>('/api/dashboard'),
};

export function mensagemDeErro(erro: unknown): string {
  if (erro instanceof Error) {
    return erro.message;
  }
  return 'Ocorreu um erro inesperado';
}
