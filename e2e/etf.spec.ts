import { test, expect } from '@playwright/test';

test('constructs, simulates, persists, and reloads a custom ETF', async ({ page }) => {
  const fundName = 'E2E Balanced Fund';

  await page.goto('./');
  await page.getByRole('button', { name: 'ETF Builder' }).click();

  await page.getByRole('textbox', { name: 'Fund Name' }).fill(fundName);
  await page.getByRole('combobox', { name: 'Rebalancing Schedule' }).selectOption('annually');
  await page.getByRole('slider', { name: 'AAPL target weight' }).fill('25');
  await page.getByRole('button', { name: 'Normalize to 100%' }).click();
  await page.getByRole('button', { name: 'Simulate Custom ETF' }).click();

  await expect(page.getByText('Saved Custom ETFs (1)')).toBeVisible();
  await expect(page.getByText(fundName, { exact: true })).toHaveCount(2);
  await expect(page.getByText(/Rebalance: annually \| History: 2015-01-02 to 2024-12-31/)).toBeVisible();
  await expect(page.getByText('Fund Holdings & Weight Comparison')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'ETF Builder' }).click();

  await expect(page.getByText('Saved Custom ETFs (1)')).toBeVisible();
  await expect(page.getByText(fundName, { exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: `Load ${fundName}` }).click();

  await expect(page.getByText(fundName, { exact: true })).toHaveCount(2);
  await expect(page.getByText(/Rebalance: annually \| History: 2015-01-02 to 2024-12-31/)).toBeVisible();
  await expect(page.getByRole('row', { name: /AAPL Apple Inc\. Technology/ })).toBeVisible();
});
