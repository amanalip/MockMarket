import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function expectNoSeriousViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  const violations = results.violations.filter(
    ({ impact }) => impact === 'serious' || impact === 'critical',
  );
  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

test('primary modes pass serious and critical Axe checks', async ({ page }) => {
  await page.goto('./');

  const modes = ['Paper Trading', 'Backtester', 'ETF Builder', 'Scenarios', 'News & Events'];
  for (const mode of modes) {
    await page.getByRole('button', { name: mode, exact: true }).click();
    await expect(page.getByRole('button', { name: mode, exact: true })).toHaveAttribute('aria-current', 'page');
    await expectNoSeriousViolations(page);
  }
});

test('share and keyboard shortcut dialogs pass Axe checks', async ({ page }) => {
  await page.goto('./');

  await page.getByRole('button', { name: 'Share session' }).click();
  await expect(page.getByRole('dialog', { name: 'Share & Export Session' })).toBeVisible();
  await expectNoSeriousViolations(page);
  await page.getByRole('button', { name: 'Close share and export dialog' }).click();

  await page.keyboard.press('?');
  await expect(page.getByRole('dialog', { name: 'Keyboard Shortcuts' })).toBeVisible();
  await expectNoSeriousViolations(page);
});

test('dialogs trap focus, close with Escape, restore focus, and block app shortcuts', async ({ page }) => {
  await page.goto('./');

  const shareButton = page.getByRole('button', { name: 'Share session' });
  await shareButton.focus();
  await shareButton.click();
  const shareClose = page.getByRole('button', { name: 'Close share and export dialog' });
  await expect(shareClose).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: 'Portfolio State (JSON)' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(shareButton).toBeFocused();

  await shareButton.click();
  const shareDialog = page.getByRole('dialog', { name: 'Share & Export Session' });
  await shareDialog.getByRole('heading', { name: 'Share & Export Session' }).click();
  await expect(shareDialog).toBeVisible();
  await shareDialog.locator('..').click({ position: { x: 2, y: 2 } });
  await expect(shareDialog).toBeHidden();
  await expect(shareButton).toBeFocused();

  const tradeNav = page.getByRole('button', { name: 'Paper Trading', exact: true });
  await tradeNav.focus();
  await page.keyboard.press('?');
  const shortcutsClose = page.getByRole('button', { name: 'Close keyboard shortcuts dialog' });
  await expect(shortcutsClose).toBeFocused();
  await page.keyboard.press('2');
  await expect(page.getByRole('heading', { name: 'Paper Trading' })).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(shortcutsClose).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(tradeNav).toBeFocused();
});

test('320px shell keeps navigation visible without document overflow', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto('./');

  const nav = page.getByRole('navigation', { name: 'Primary navigation' });
  await expect(nav).toBeVisible();

  for (const mode of ['Paper Trading', 'Backtester', 'ETF Builder', 'Scenarios', 'News & Events']) {
    const navButton = page.getByRole('button', { name: mode, exact: true });
    await expect(navButton).toBeVisible();
    await navButton.click();
    const overflow = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      offenders: Array.from(document.querySelectorAll<HTMLElement>('body *'))
        .filter((element) => element.getBoundingClientRect().right > window.innerWidth + 1)
        .slice(0, 5)
        .map((element) => ({ tag: element.tagName, className: element.className, right: element.getBoundingClientRect().right })),
    }));
    expect(overflow.documentWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(overflow.viewportWidth);
  }
});
