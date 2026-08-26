import { describe, it, expect } from 'vitest';
import { CORE_TICKERS } from '../model/tickers';
import { loadTickerData } from '../data/loader';

describe('Historical 100-Ticker Dataset Suite', () => {
  it('contains at least 84 ticker metadata definitions', () => {
    expect(CORE_TICKERS.length).toBeGreaterThanOrEqual(84);
  });

  it('loads sample tickers across all asset categories', async () => {
    const testTickers = ['NVDA', 'BAC', 'CAT', 'XLE', 'BTC'];

    for (const sym of testTickers) {
      const candles = await loadTickerData(sym);
      expect(candles.length, `Candles missing for ${sym}`).toBeGreaterThan(2000);
      expect(candles[0].time).toMatch(/^2015-/);
      expect(candles[candles.length - 1].time).toMatch(/^2024-/);
    }
  });
});
