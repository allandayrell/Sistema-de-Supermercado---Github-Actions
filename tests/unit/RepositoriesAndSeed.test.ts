import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  popularCatalogoInicial,
  PRODUTOS_SEED_MERCADO_HORIZONTE,
} from '../../src/infrastructure/seed.js';
import { InMemoryProdutoRepository } from '../../src/repositories/InMemoryProdutoRepository.js';
import { InMemoryVendaRepository } from '../../src/repositories/InMemoryVendaRepository.js';
import {
  JsonProdutoRepository,
  JsonVendaRepository,
} from '../../src/repositories/JsonFileStorage.js';
import { CaixaService } from '../../src/services/CaixaService.js';
import { CheckoutService } from '../../src/services/CheckoutService.js';
import { EstoqueService } from '../../src/services/EstoqueService.js';
import { Produto, ReciboVenda } from '../../src/shared/contracts.js';

describe('Repositórios e Seed Inicial', () => {
  const diretoriosTemporarios: string[] = [];

  afterEach(() => {
    while (diretoriosTemporarios.length > 0) {
      const dir = diretoriosTemporarios.pop()!;
      rmSync(dir, { recursive: true, force: true });
    }
  });

  function criarArquivoTemporario(nomeArquivo: string): string {
    const dir = mkdtempSync(join(tmpdir(), 'mh-repo-'));
    diretoriosTemporarios.push(dir);
    return join(dir, nomeArquivo);
  }

  it('deve persistir e remover produtos no repositório em memória com isolamento de cópia', () => {
    const repo = new InMemoryProdutoRepository();
    const produto: Produto = {
      sku: 'mer-010',
      nome: 'Farinha de Trigo',
      categoria: 'Mercearia',
      preco: 6.5,
      quantidade: 15,
      estoqueMinimo: 4,
      ativo: true,
    };

    const salvo = repo.salvar(produto);
    salvo.quantidade = 999;

    const consultado = repo.buscarPorSku('MER-010');
    expect(consultado?.quantidade).toBe(15);
    expect(repo.buscarPorNome('farinha de trigo')?.sku).toBe('MER-010');
    expect(repo.listarTodos()).toHaveLength(1);
    expect(repo.remover('MER-010')).toBe(true);
    expect(repo.buscarPorSku('MER-010')).toBeNull();
  });

  it('deve persistir produtos e vendas em arquivo JSON local de forma idempotente', () => {
    const prodRepo = new JsonProdutoRepository(criarArquivoTemporario('produtos.json'));
    const vendaRepo = new JsonVendaRepository(criarArquivoTemporario('vendas.json'));

    prodRepo.salvar({
      sku: 'BEB-010',
      nome: 'Suco de Uva',
      categoria: 'Bebidas',
      preco: 14.0,
      quantidade: 12,
      estoqueMinimo: 3,
      ativo: true,
    });

    expect(prodRepo.buscarPorNome('suco de uva')?.sku).toBe('BEB-010');
    expect(prodRepo.remover('INEXISTENTE')).toBe(false);
    expect(prodRepo.remover('BEB-010')).toBe(true);
    expect(prodRepo.listarTodos()).toHaveLength(0);

    const venda: ReciboVenda = {
      id: 'venda-1',
      data: '2026-11-25T18:00:00.000Z',
      status: 'CONCLUIDA',
      itens: [{ nome: 'Suco de Uva', precoUnitario: 14, quantidade: 2 }],
      subtotal: 28,
      cupomAplicado: null,
      descontoCupom: 0,
      descontoExtra: 0,
      totalDesconto: 0,
      totalFinal: 28,
    };

    vendaRepo.registrar(venda);
    venda.status = 'ESTORNADA';
    vendaRepo.atualizar(venda);

    expect(vendaRepo.buscarPorId('venda-1')?.status).toBe('ESTORNADA');
    expect(vendaRepo.listarTodas()).toHaveLength(1);
  });

  it('deve popular o catálogo inicial do Mercado Horizonte sem duplicar itens em chamadas repetidas', () => {
    const estoque = new EstoqueService();

    popularCatalogoInicial(estoque);
    popularCatalogoInicial(estoque);

    expect(estoque.listarProdutos()).toHaveLength(
      PRODUTOS_SEED_MERCADO_HORIZONTE.length,
    );
    expect(estoque.consultarProduto('MER-001').nome).toBe('Arroz Tipo 1 (5kg)');
  });

  it('deve registrar venda concluída no repositório durante o checkout', () => {
    const estoque = new EstoqueService();
    const caixa = new CaixaService();
    const vendaRepo = new InMemoryVendaRepository();
    const checkout = new CheckoutService(estoque, caixa, vendaRepo);

    estoque.cadastrarProduto('Café', 20, 10, { sku: 'CAF-1', categoria: 'Bebidas' });
    checkout.adicionarProdutoAoCarrinho('CAF-1', 2);

    const recibo = checkout.finalizarCompra();

    expect(recibo.status).toBe('CONCLUIDA');
    expect(vendaRepo.buscarPorId(recibo.id)?.totalFinal).toBe(40);
    expect(vendaRepo.listarTodas()).toHaveLength(1);
  });
});
