import { expect, test } from '@playwright/test';

test.describe('Smoke E2E - Mercado Horizonte', () => {
  test('deve carregar a interface web e confirmar conexão com a API', async ({
    page,
  }) => {
    await page.goto('/');

    await expect(
      page.getByRole('heading', { name: 'Mercado Horizonte' }),
    ).toBeVisible();
    await expect(page.getByTestId('api-status')).toContainText('API Online');
  });
});
