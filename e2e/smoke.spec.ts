import { test, expect } from '@playwright/test';

test('app shell loads and displays title', async ({ page }) => {
  await page.goto('./');
  await expect(page).toHaveTitle(/MockMarket/i);
  await expect(page.getByRole('banner')).toContainText('MockMarket');
  await expect(page.getByRole('heading', { name: 'Paper Trading' })).toBeVisible();
  await expect(page.getByRole('note', { name: 'Simulation data notice' })).toBeVisible();
  await expect(page.getByTitle(/^Release /)).toContainText(/^v1\.0\.0/);
});
