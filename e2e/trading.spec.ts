import { test, expect } from '@playwright/test';

test('selects a ticker, trades through repricing, and realizes P&L', async ({ page }) => {
  await page.goto('./');

  await page.getByRole('button', { name: 'Select MSFT' }).click();
  await expect(page.getByRole('button', { name: 'Submit Buy MSFT' })).toBeEnabled();

  await page.getByRole('spinbutton', { name: 'Shares' }).fill('10');
  await page.getByRole('button', { name: 'Submit Buy MSFT' }).click();

  const holdingsTable = page.getByRole('table').filter({
    has: page.getByRole('columnheader', { name: 'Avg Cost' }),
  });
  await expect(holdingsTable.getByRole('row', { name: /View MSFT chart Microsoft Corporation/ })).toContainText('$349.96');

  await page.getByRole('button', { name: '+1 Day' }).click();
  await expect(page.getByLabel('Simulation date')).toHaveValue('2024-01-03');
  await expect(holdingsTable.getByRole('row', { name: /View MSFT chart Microsoft Corporation/ })).toContainText('$350.81');
  await expect(holdingsTable.getByRole('row', { name: /View MSFT chart Microsoft Corporation/ })).toContainText('+$8.50');

  await page.getByRole('button', { name: 'Sell MSFT' }).click();
  await page.getByRole('button', { name: 'Submit Sell MSFT' }).click();

  await expect(holdingsTable.getByRole('cell', { name: /No active holdings/ })).toBeVisible();
  await expect(page.getByRole('main')).toContainText(/Realized P&L\s*\+\$8\.50/);
});
