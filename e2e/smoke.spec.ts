import { test, expect } from '@playwright/test';

test('app shell loads and displays title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/MockMarket/i);
  await expect(page.getByText('MockMarket')).toBeVisible();
  await expect(page.getByText('Paper Trading')).toBeVisible();
});
