import { expect, test } from '@playwright/test';

test('keyboard and responsive acceptance across primary modes', async ({ page }) => {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  await page.goto('./');

  const modes = [
    ['1', 'Paper Trading'],
    ['2', 'Backtester'],
    ['3', 'ETF Builder'],
    ['4', 'Scenarios'],
    ['5', 'News & Events'],
  ] as const;

  for (const [key, label] of modes) {
    await page.keyboard.press(key);
    await expect(page.getByRole('button', { name: label, exact: true })).toHaveAttribute('aria-current', 'page');
    const width = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: document.documentElement.clientWidth,
    }));
    expect(width.document, `${label} overflow at ${width.viewport}px`).toBeLessThanOrEqual(width.viewport);
  }

  await page.keyboard.press('1');
  await page.keyboard.press('s');
  await expect(page.locator('#trade-sell-tab')).toBeFocused();
  await page.keyboard.press('b');
  await expect(page.locator('#trade-buy-tab')).toBeFocused();

  await page.keyboard.press('?');
  await expect(page.getByRole('dialog', { name: 'Keyboard Shortcuts' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Keyboard Shortcuts' })).toBeHidden();
  expect(errors).toEqual([]);
});
