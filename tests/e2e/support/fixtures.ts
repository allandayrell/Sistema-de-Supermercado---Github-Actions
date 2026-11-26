import { expect, type APIRequestContext, type Page } from '@playwright/test';

export interface ProdutoE2E {
  sku: string;
  nome: string;
  preco: number;
  quantidade: number;
}

let sequencia = 0;

/** Gera SKU e nome únicos para que cada jornada use dados próprios. */
export function identificadorUnico(prefixo: string): { sku: string; nome: string } {
  sequencia += 1;
  const sufixo = `${Date.now().toString(36)}${sequencia}`.toUpperCase();
  return { sku: `E2E-${sufixo}`, nome: `${prefixo} ${sufixo}` };
}

export async function criarProdutoViaApi(
  request: APIRequestContext,
  prefixo: string,
  dados: { preco: number; quantidade: number; estoqueMinimo?: number },
): Promise<ProdutoE2E> {
  const { sku, nome } = identificadorUnico(prefixo);
  const resposta = await request.post('/api/produtos', {
    data: { sku, nome, categoria: 'Outros', estoqueMinimo: 0, ...dados },
  });
  expect(resposta.status()).toBe(201);
  return { sku, nome, preco: dados.preco, quantidade: dados.quantidade };
}

/** Abre a aplicação depois de preparar os dados, para o catálogo já vir atualizado. */
export async function abrirApp(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('api-status')).toContainText('API Online');
}

export async function abrirModulo(page: Page, modulo: 'PDV / Caixa' | 'Estoque' | 'Vendas & Painel') {
  await page.getByRole('tab', { name: modulo }).click();
}

export async function adicionarAoCarrinho(page: Page, nomeProduto: string) {
  await page.getByLabel('Buscar produto').fill(nomeProduto);
  await page.getByRole('button', { name: `Adicionar ${nomeProduto}` }).click();
  await expect(page.getByTestId('total-final')).toBeVisible();
}

export function linhaDoEstoque(page: Page, nomeProduto: string) {
  return page.getByRole('row').filter({ hasText: nomeProduto });
}

/** Coluna "Saldo" da tabela de estoque (SKU, Produto, Categoria, Preço, Saldo...). */
export function saldoNoEstoque(page: Page, nomeProduto: string) {
  return linhaDoEstoque(page, nomeProduto).getByRole('cell').nth(4);
}

export async function buscarNoEstoque(page: Page, nomeProduto: string) {
  await abrirModulo(page, 'Estoque');
  await page.getByRole('searchbox', { name: 'Buscar' }).fill(nomeProduto);
}
