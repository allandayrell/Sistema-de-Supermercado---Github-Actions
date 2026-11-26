import { Request, Response, Router } from 'express';
import {
  CATEGORIAS_PRODUTO,
  CadastroProdutoInput,
  CategoriaProduto,
  FiltroProdutos,
  ValidacaoError,
} from '../../models/types.js';
import { EstoqueService } from '../../services/EstoqueService.js';

function lerCorpo(req: Request): Record<string, unknown> {
  return typeof req.body === 'object' && req.body !== null ? req.body : {};
}

function exigirNumero(valor: unknown, campo: string): number {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) {
    throw new ValidacaoError(`O campo "${campo}" deve ser um número`);
  }
  return valor;
}

function lerTextoOpcional(valor: unknown, campo: string): string | undefined {
  if (valor === undefined || valor === null || valor === '') {
    return undefined;
  }
  if (typeof valor !== 'string') {
    throw new ValidacaoError(`O campo "${campo}" deve ser um texto`);
  }
  return valor;
}

function lerCategoria(valor: unknown): CategoriaProduto | undefined {
  const categoria = lerTextoOpcional(valor, 'categoria');
  if (categoria !== undefined && !CATEGORIAS_PRODUTO.includes(categoria as CategoriaProduto)) {
    throw new ValidacaoError(`Categoria "${categoria}" inválida`);
  }
  return categoria as CategoriaProduto | undefined;
}

function lerCadastro(corpo: Record<string, unknown>): CadastroProdutoInput {
  if (typeof corpo.nome !== 'string') {
    throw new ValidacaoError('Nome do produto é obrigatório');
  }
  return {
    nome: corpo.nome,
    preco: exigirNumero(corpo.preco, 'preco'),
    quantidade: exigirNumero(corpo.quantidade, 'quantidade'),
    sku: lerTextoOpcional(corpo.sku, 'sku'),
    categoria: lerCategoria(corpo.categoria),
    estoqueMinimo:
      corpo.estoqueMinimo === undefined || corpo.estoqueMinimo === null
        ? undefined
        : exigirNumero(corpo.estoqueMinimo, 'estoqueMinimo'),
  };
}

export function criarRotasProdutos(estoqueService: EstoqueService): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    const filtro: FiltroProdutos = {
      busca: typeof req.query.busca === 'string' ? req.query.busca : undefined,
      categoria: lerCategoria(req.query.categoria),
      apenasEstoqueBaixo: req.query.estoqueBaixo === 'true',
    };
    res.json(estoqueService.listarProdutos(filtro));
  });

  router.post('/', (req: Request, res: Response) => {
    const dados = lerCadastro(lerCorpo(req));
    const produto = estoqueService.cadastrarProduto(dados.nome, dados.preco, dados.quantidade, {
      sku: dados.sku,
      categoria: dados.categoria,
      estoqueMinimo: dados.estoqueMinimo,
    });
    res.status(201).json(produto);
  });

  router.patch('/:sku', (req: Request<{ sku: string }>, res: Response) => {
    const preco = exigirNumero(lerCorpo(req).preco, 'preco');
    res.json(estoqueService.atualizarPreco(req.params.sku, preco));
  });

  router.post('/:sku/repor', (req: Request<{ sku: string }>, res: Response) => {
    const quantidade = exigirNumero(lerCorpo(req).quantidade, 'quantidade');
    res.json(estoqueService.reporEstoque(req.params.sku, quantidade));
  });

  router.delete('/:sku', (req: Request<{ sku: string }>, res: Response) => {
    estoqueService.removerProduto(req.params.sku);
    res.status(204).end();
  });

  return router;
}
