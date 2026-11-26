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

export interface AppContainer {
  estoqueService: EstoqueService;
  caixaService: CaixaService;
  checkoutService: CheckoutService;
}

export function createDefaultContainer(dataDir = process.env.DATA_DIR): AppContainer {
  const produtoRepo = dataDir
    ? new JsonProdutoRepository(join(dataDir, 'produtos.json'))
    : new InMemoryProdutoRepository();
  const vendaRepo = dataDir
    ? new JsonVendaRepository(join(dataDir, 'vendas.json'))
    : new InMemoryVendaRepository();

  const estoqueService = new EstoqueService(produtoRepo);
  popularCatalogoInicial(estoqueService);

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
  container: AppContainer = createDefaultContainer(),
  options: CreateAppOptions = {},
): express.Express {
  const app = express();
  app.use(express.json());

  app.locals.container = container;

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'Mercado Horizonte',
      produtosCadastrados: container.estoqueService.listarProdutos().length,
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/api/produtos', criarRotasProdutos(container.estoqueService));
  app.use('/api', criarRotasCaixa(container.checkoutService));

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
