import { test, expect } from '@playwright/test';

test('restores a generated share link in a fresh browser context', async ({ browser, page }) => {
  await page.goto('./');

  await page.getByRole('button', { name: 'Select MSFT' }).click();
  await expect(page.getByRole('button', { name: 'Submit Buy MSFT' })).toBeEnabled();
  await page.getByLabel('Simulation date').fill('2024-02-01');
  await page.getByRole('button', { name: 'Backtester' }).click();
  await page.getByRole('combobox', { name: 'Ticker' }).selectOption('MSFT');

  await page.getByRole('button', { name: 'Share session' }).click();
  const shareUrl = await page.getByLabel('Shareable URL (State Encoded)').inputValue();
  expect(shareUrl).toContain('#share=');

  const freshContext = await browser.newContext();
  try {
    const restoredPage = await freshContext.newPage();
    await restoredPage.goto(shareUrl);

    await expect(restoredPage.getByRole('heading', { name: 'Strategy Backtester' })).toBeVisible();
    await expect(restoredPage.getByRole('combobox', { name: 'Ticker' })).toHaveValue('MSFT');
    await expect(restoredPage.getByRole('banner')).toContainText('2024-02-01');
    await expect(restoredPage.getByRole('banner')).toContainText('$100,000.00');
  } finally {
    await freshContext.close();
  }
});
