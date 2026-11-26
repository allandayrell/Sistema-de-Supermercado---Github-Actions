import { expect, test } from '@playwright/test';
import {
  abrirApp,
  abrirModulo,
  adicionarAoCarrinho,
  buscarNoEstoque,
  criarProdutoViaApi,
  identificadorUnico,
  linhaDoEstoque,
  saldoNoEstoque,
} from './support/fixtures';

test.describe('Jornadas críticas do Mercado Horizonte', () => {
  test('compra completa no PDV com cupom DESC10 via PIX baixa o estoque', async ({
    page,
    request,
  }) => {
    const produto = await criarProdutoViaApi(request, 'Cesta Básica', {
      preco: 50,
      quantidade: 10,
    });
    await abrirApp(page);

    await adicionarAoCarrinho(page, produto.nome);
    await page.getByLabel('Código do cupom').fill('DESC10');
    await page.getByRole('button', { name: 'Aplicar' }).click();
    await expect(page.getByTestId('cupom-aplicado')).toHaveText('DESC10');
    await expect(page.getByTestId('total-final')).toHaveText('R$ 45,00');

    await page.getByRole('radio', { name: 'PIX' }).check();
    await page.getByRole('button', { name: 'Finalizar venda' }).click();

    const recibo = page.getByTestId('recibo');
    await expect(recibo).toContainText('Venda concluída');
    await expect(recibo).toContainText(produto.nome);
    await expect(page.getByTestId('recibo-total')).toHaveText('R$ 45,00');
    await expect(page.getByTestId('recibo-pagamento')).toHaveText('PIX');

    await buscarNoEstoque(page, produto.nome);
    await expect(saldoNoEstoque(page, produto.nome)).toHaveText('9');
  });

  test('bloqueia venda acima do estoque e preserva o saldo', async ({ page, request }) => {
    const produto = await criarProdutoViaApi(request, 'Azeite Raro', {
      preco: 40,
      quantidade: 2,
    });
    await abrirApp(page);

    await adicionarAoCarrinho(page, produto.nome);
    await page.getByRole('button', { name: `Aumentar ${produto.nome}` }).click();
    await page.getByRole('button', { name: `Aumentar ${produto.nome}` }).click();
    await expect(page.getByLabel(`Quantidade de ${produto.nome}`)).toHaveText('3');

    await page.getByRole('radio', { name: 'PIX' }).check();
    await page.getByRole('button', { name: 'Finalizar venda' }).click();

    await expect(page.getByRole('alert')).toContainText('Estoque insuficiente');
    await expect(page.getByTestId('recibo')).toHaveCount(0);

    await buscarNoEstoque(page, produto.nome);
    await expect(saldoNoEstoque(page, produto.nome)).toHaveText('2');
  });

  test('cadastra produto com estoque baixo e repõe unidades', async ({ page }) => {
    const { sku, nome } = identificadorUnico('Granola Artesanal');
    await abrirApp(page);
    await abrirModulo(page, 'Estoque');

    await page.getByLabel(/^Nome/).fill(nome);
    await page.getByLabel('SKU (opcional)').fill(sku);
    await page.getByLabel(/^Categoria/).first().selectOption('Mercearia');
    await page.getByLabel(/^Preço unitário/).fill('7,50');
    await page.getByLabel(/^Quantidade inicial/).fill('2');
    await page.getByLabel(/^Estoque mínimo/).fill('5');
    await page.getByRole('button', { name: 'Cadastrar produto' }).click();

    await expect(page.getByTestId('banner-sucesso')).toContainText('cadastrado com sucesso');
    await page.getByRole('searchbox', { name: 'Buscar' }).fill(nome);
    await expect(linhaDoEstoque(page, nome)).toContainText('Estoque baixo');
    await expect(saldoNoEstoque(page, nome)).toHaveText('2');

    page.once('dialog', (dialogo) => dialogo.accept('10'));
    await page.getByRole('button', { name: `Repor estoque de ${nome}` }).click();

    await expect(saldoNoEstoque(page, nome)).toHaveText('12');
    await expect(linhaDoEstoque(page, nome)).toContainText('Regular');
  });

  test('pagamento em dinheiro calcula e registra o troco', async ({ page, request }) => {
    const produto = await criarProdutoViaApi(request, 'Queijo Minas', {
      preco: 30,
      quantidade: 5,
    });
    await abrirApp(page);

    await adicionarAoCarrinho(page, produto.nome);
    await page.getByRole('radio', { name: 'Dinheiro' }).check();
    await page.getByLabel('Valor recebido (R$)').fill('50');
    await expect(page.getByTestId('troco-previsto')).toHaveText('Troco: R$ 20,00');

    await page.getByRole('button', { name: 'Finalizar venda' }).click();

    await expect(page.getByTestId('recibo-pagamento')).toHaveText('Dinheiro');
    await expect(page.getByTestId('recibo-total')).toHaveText('R$ 30,00');
    await expect(page.getByTestId('recibo-troco')).toHaveText('R$ 20,00');
  });

  test('estorna venda no histórico e devolve os itens ao estoque', async ({
    page,
    request,
  }) => {
    const produto = await criarProdutoViaApi(request, 'Vinho Tinto', {
      preco: 60,
      quantidade: 10,
    });
    const venda = await request.post('/api/checkout', {
      data: { itens: [{ sku: produto.sku, quantidade: 3 }], pagamento: { forma: 'PIX' } },
    });
    expect(venda.status()).toBe(201);
    const { id } = (await venda.json()) as { id: string };
    await abrirApp(page);

    await abrirModulo(page, 'Vendas & Painel');
    const cartaoVenda = page.getByTestId(`venda-${id}`);
    await expect(cartaoVenda).toContainText('Concluída');

    page.once('dialog', (dialogo) => dialogo.accept());
    await cartaoVenda.getByRole('button', { name: /^Estornar venda/ }).click();

    await expect(cartaoVenda).toContainText('Estornada');
    await expect(cartaoVenda.getByRole('button')).toBeDisabled();

    await buscarNoEstoque(page, produto.nome);
    await expect(saldoNoEstoque(page, produto.nome)).toHaveText('10');
  });
});
