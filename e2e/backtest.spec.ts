import { test, expect } from '@playwright/test';

test('runs deterministic short-window rules and displays exact results', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Backtester' }).click();

  await page.getByRole('combobox', { name: 'Ticker' }).selectOption('AAPL');
  await page.getByRole('textbox', { name: 'Start Date' }).fill('2020-01-02');
  await page.getByRole('textbox', { name: 'End Date' }).fill('2020-01-10');
  await page.getByRole('spinbutton', { name: 'Starting Capital ($)' }).fill('100000');
  await page.getByRole('textbox', { name: 'Entry Condition' }).fill('CLOSE > 0');
  await page.getByRole('textbox', { name: 'Exit Condition' }).fill('CLOSE > 0');
  await page.getByRole('spinbutton', { name: 'Position Size (%)' }).fill('100');
  await page.getByRole('spinbutton', { name: 'Stop Loss (%)' }).fill('0');
  await page.getByRole('spinbutton', { name: 'Take Profit (%)' }).fill('0');

  await page.getByRole('button', { name: 'Execute Backtest' }).click();

  const results = page.getByRole('region', { name: 'Backtest Results' });
  await expect(results).toContainText('AAPL | 2020-01-02 to 2020-01-10');
  await expect(results).toContainText(/Strategy Return\s*-0\.81%/);
  await expect(results).toContainText(/SPY Benchmark\s*-1\.02%/);
  await expect(results).toContainText(/Win Rate\s*33\.3%\s*1W \/ 2L \(3 total\)/);
  await expect(results).toContainText(/Profit Factor\s*0\.38/);

  const trades = results.getByRole('table').filter({
    has: page.getByRole('columnheader', { name: 'Entry Date' }),
  });
  await expect(trades.getByRole('row', { name: '1 2020-01-03 $75.14 2020-01-06 $75.51 1330 +$492.10 +0.49% Signal Exit' })).toBeVisible();
  await expect(trades.getByRole('row', { name: '2 2020-01-07 $75.39 2020-01-08 $74.46 1332 $-1238.76 -1.23% Signal Exit' })).toBeVisible();
  await expect(trades.getByRole('row', { name: '3 2020-01-09 $74.00 2020-01-10 $73.95 1341 $-67.05 -0.07% Signal Exit' })).toBeVisible();
});
