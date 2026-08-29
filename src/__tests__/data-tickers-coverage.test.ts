import { describe, it, expect } from 'vitest';
import { CORE_TICKERS, getTickerInfo, getAllSectors, getAllIndustries } from '../model/tickers';
import { Candle } from '../model/types';

describe('Data Tickers Coverage', () => {
  it('CORE_TICKERS at least 80', () => {
    expect(CORE_TICKERS.length).toBeGreaterThanOrEqual(80);
  });

  it('getTickerInfo for AAPL', () => {
    expect(getTickerInfo('AAPL')?.name).toBe('Apple Inc.');
  });

  it('getTickerInfo case insensitive', () => {
    expect(getTickerInfo('aapl')?.ticker).toBe('AAPL');
    expect(getTickerInfo('MsFt')?.ticker).toBe('MSFT');
  });

  it('getTickerInfo unknown undefined', () => {
    expect(getTickerInfo('FAKE123')).toBeUndefined();
  });

  it('getAllSectors includes Technology', () => {
    expect(getAllSectors()).toContain('Technology');
    expect(getAllSectors()).toContain('ETF');
  });

  it('getAllIndustries for Technology includes Semiconductors', () => {
    expect(getAllIndustries('Technology')).toContain('Semiconductors');
  });

  it('search by query via filter', () => {
    const filter = (q: string) => CORE_TICKERS.filter(t => t.name.toLowerCase().includes(q.toLowerCase()) || t.ticker.toLowerCase().includes(q.toLowerCase()));
    expect(filter('Apple').some(t => t.ticker === 'AAPL')).toBe(true);
    expect(filter('aapl').length).toBeGreaterThan(0);
  });

  it('filter empty returns all', () => {
    const filter = (q: string) => CORE_TICKERS.filter(t => q === '' ? true : t.name.includes(q));
    expect(filter('').length).toBe(CORE_TICKERS.length);
  });

  it('all tickers have required fields', () => {
    CORE_TICKERS.forEach(t => {
      expect(t.ticker).toBeTruthy();
      expect(t.name).toBeTruthy();
      expect(t.sector).toBeTruthy();
      expect(t.assetType).toBeTruthy();
    });
  });

  it('assetType counts', () => {
    expect(CORE_TICKERS.filter(t => t.assetType === 'etf').length).toBeGreaterThan(5);
    expect(CORE_TICKERS.filter(t => t.assetType === 'crypto').length).toBeGreaterThanOrEqual(2);
    expect(CORE_TICKERS.filter(t => t.assetType === 'stock').length).toBeGreaterThan(50);
  });

  it('tickers unique', () => {
    const ids = CORE_TICKERS.map(t => t.ticker);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('sector counts at least 5', () => {
    expect(getAllSectors().length).toBeGreaterThanOrEqual(5);
  });

  it('search by sector via filter', () => {
    expect(CORE_TICKERS.filter(t => t.sector === 'Technology').length).toBeGreaterThan(0);
  });

  it('ticker BRK.B exists', () => {
    expect(getTickerInfo('BRK.B')).toBeDefined();
  });

  it('ticker SPY is etf', () => {
    expect(getTickerInfo('SPY')?.assetType).toBe('etf');
  });

  it('ticker BTC is crypto', () => {
    expect(getTickerInfo('BTC')?.assetType).toBe('crypto');
  });

  it('industry for Healthcare', () => {
    expect(getAllIndustries('Healthcare').length).toBeGreaterThan(0);
  });

  it('ticker with large cap', () => {
    expect(CORE_TICKERS.some(t => (t.marketCap || 0) > 1e12)).toBe(true);
  });

  it('ticker dividendYield range', () => {
    CORE_TICKERS.forEach(t => {
      if (t.dividendYield !== undefined) {
        expect(t.dividendYield).toBeGreaterThanOrEqual(0);
        expect(t.dividendYield).toBeLessThan(15);
      }
    });
  });

  it('search partial ticker', () => {
    expect(CORE_TICKERS.filter(t => t.ticker.includes('AA')).some(t => t.ticker.includes('AA'))).toBe(true);
  });

  it('getAllSectors no duplicates', () => {
    const s = getAllSectors();
    expect(new Set(s).size).toBe(s.length);
  });

  it('ticker description optional', () => {
    // descriptions are optional, ensure field exists as undefined or string
    expect(CORE_TICKERS.every(t => t.description === undefined || typeof t.description === 'string')).toBe(true);
  });

  it('Candle type example', () => {
    const c: Candle = { time: '2024-01-01', open: 100, high: 110, low: 90, close: 105, volume: 1000 };
    expect(c.close).toBe(105);
  });

  it('CORE_TICKERS sorted or not but length stable', () => {
    expect(CORE_TICKERS.length).toBeGreaterThan(80);
  });

  it('search with no match returns empty', () => {
    expect(CORE_TICKERS.filter(t => t.ticker === 'ZZZZUNKNOWN').length).toBe(0);
  });
});
