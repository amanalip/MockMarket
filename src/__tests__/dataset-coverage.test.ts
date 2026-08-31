import { describe, it, expect } from 'vitest';
import { CORE_TICKERS } from '../model/tickers';
import { loadTickerData } from '../data/loader';

describe('Synthetic ticker dataset suite', () => {
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

  it('uses the equity exchange calendar while retaining 24/7 crypto dates', async () => {
    const [spy, btc] = await Promise.all([loadTickerData('SPY'), loadTickerData('BTC')]);
    const spyDates = new Set(spy.map((candle) => candle.time));
    const btcDates = new Set(btc.map((candle) => candle.time));

    expect(spy).toHaveLength(2516);
    expect(btc).toHaveLength(3653);
    expect(spyDates.has('2018-12-05')).toBe(false);
    expect(spyDates.has('2024-03-29')).toBe(false); // Good Friday
    expect(spyDates.has('2024-11-29')).toBe(true); // Early-close session
    expect(spyDates.has('2024-10-14')).toBe(true); // Columbus Day
    expect(btcDates.has('2024-03-29')).toBe(true);
    expect(btcDates.has('2024-03-30')).toBe(true);
  });
});
