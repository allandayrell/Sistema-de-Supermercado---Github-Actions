import express, { NextFunction, Request, Response } from 'express';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { popularCatalogoInicial } from '../infrastructure/seed.js';
import {
  CupomInvalidoError,
  EstoqueInsuficienteError,
  PagamentoInsuficienteError,
  ProdutoNaoEncontradoError,
  ValidacaoError,
  VendaJaEstornadaError,
  VendaNaoEncontradaError,
} from '../models/types.js';
import { InMemoryProdutoRepository } from '../repositories/InMemoryProdutoRepository.js';
import { InMemoryVendaRepository } from '../repositories/InMemoryVendaRepository.js';
import type { IProdutoRepository } from '../repositories/IProdutoRepository.js';
import type { IVendaRepository } from '../repositories/IVendaRepository.js';
import {
  JsonProdutoRepository,
  JsonVendaRepository,
} from '../repositories/JsonFileStorage.js';
import { CaixaService } from '../services/CaixaService.js';
import { CheckoutService } from '../services/CheckoutService.js';
import { EstoqueService } from '../services/EstoqueService.js';
import { ApiErrorResponse } from '../shared/contracts.js';
import { criarRotasCaixa } from './routes/caixa.js';
import { criarRotasProdutos } from './routes/produtos.js';
import { criarRotasVendas } from './routes/vendas.js';

export interface AppContainer {
  estoqueService: EstoqueService;
  caixaService: CaixaService;
  checkoutService: CheckoutService;
}

export type ExecutarNoContainer = <T>(
  tipo: 'leitura' | 'escrita',
  operacao: (container: AppContainer) => T,
) => Promise<T>;

export function createDefaultContainer(dataDir = process.env.DATA_DIR): AppContainer {
  const produtoRepo = dataDir
    ? new JsonProdutoRepository(join(dataDir, 'produtos.json'))
    : new InMemoryProdutoRepository();
  const vendaRepo = dataDir
    ? new JsonVendaRepository(join(dataDir, 'vendas.json'))
    : new InMemoryVendaRepository();

  const container = criarContainer(produtoRepo, vendaRepo);
  popularCatalogoInicial(container.estoqueService);
  return container;
}

export function criarContainer(
  produtoRepo: IProdutoRepository,
  vendaRepo: IVendaRepository,
): AppContainer {
  const estoqueService = new EstoqueService(produtoRepo);
  const caixaService = new CaixaService();
  const checkoutService = new CheckoutService(estoqueService, caixaService, vendaRepo);

  return { estoqueService, caixaService, checkoutService };
}

function resolverErroHttp(erro: unknown): { status: number; body: ApiErrorResponse } {
  if (erro instanceof ValidacaoError) {
    return { status: 400, body: { erro: erro.message, codigo: 'VALIDACAO_ERROR' } };
  }
  if (erro instanceof CupomInvalidoError) {
    return { status: 400, body: { erro: erro.message, codigo: 'CUPOM_INVALIDO' } };
  }
  if (erro instanceof PagamentoInsuficienteError) {
    return { status: 400, body: { erro: erro.message, codigo: 'PAGAMENTO_INSUFICIENTE' } };
  }
  if (
    erro instanceof ProdutoNaoEncontradoError ||
    erro instanceof VendaNaoEncontradaError
  ) {
    return { status: 404, body: { erro: erro.message, codigo: 'NAO_ENCONTRADO' } };
  }
  if (
    erro instanceof EstoqueInsuficienteError ||
    erro instanceof VendaJaEstornadaError
  ) {
    return { status: 409, body: { erro: erro.message, codigo: 'CONFLITO_DOMINIO' } };
  }
  if (erro instanceof SyntaxError) {
    return { status: 400, body: { erro: 'JSON inválido na requisição', codigo: 'JSON_INVALIDO' } };
  }

  return {
    status: 500,
    body: { erro: 'Erro interno do servidor', codigo: 'ERRO_INTERNO' },
  };
}

export interface CreateAppOptions {
  clientDistPath?: string;
}

export function createApp(
  containerOuExecutor: AppContainer | ExecutarNoContainer = createDefaultContainer(),
  options: CreateAppOptions = {},
): express.Express {
  const app = express();
  const executar: ExecutarNoContainer = typeof containerOuExecutor === 'function'
    ? containerOuExecutor
    : async (_tipo, operacao) => operacao(containerOuExecutor);
  if (typeof containerOuExecutor !== 'function') {
    app.locals.container = containerOuExecutor;
  }

  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json());

  app.get('/api/health', async (_req: Request, res: Response) => {
    const produtosCadastrados = await executar('leitura', ({ estoqueService }) =>
      estoqueService.listarProdutos().length,
    );
    res.json({
      status: 'ok',
      service: 'Mercado Horizonte',
      produtosCadastrados,
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/produtos', criarRotasProdutos(executar));
  app.use('/api', criarRotasCaixa(executar));
  app.use('/api', criarRotasVendas(executar));

  app.use('/api', (_req: Request, res: Response) => {
    res.status(404).json({
      erro: 'Endpoint da API não encontrado',
      codigo: 'ROTA_NAO_ENCONTRADA',
    } satisfies ApiErrorResponse);
  });

  const clientDistPath =
    options.clientDistPath ?? resolve(process.cwd(), 'dist', 'client');
  const indexHtmlPath = join(clientDistPath, 'index.html');

  if (existsSync(indexHtmlPath)) {
    app.use(express.static(clientDistPath));
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method === 'GET' && !req.path.startsWith('/api')) {
        res.sendFile(indexHtmlPath);
        return;
      }
      next();
    });
  }

  app.use((erro: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const { status, body } = resolverErroHttp(erro);
    res.status(status).json(body);
  });

  return app;
}
