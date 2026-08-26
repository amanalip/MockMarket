import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CORE_TICKERS, getTickerInfo, getAllSectors, getAllIndustries } from '../model/tickers';
import { loadTickerData, filterCandlesByDate, getLatestCandleOnOrBefore } from '../data/loader';
import { Candle } from '../model/types';

describe('Ticker Metadata & Data Loader', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('provides comprehensive metadata for core tickers', () => {
    expect(CORE_TICKERS.length).toBeGreaterThanOrEqual(80);
    const aapl = getTickerInfo('AAPL');
    expect(aapl).toBeDefined();
    expect(aapl?.name).toBe('Apple Inc.');
    expect(aapl?.sector).toBe('Technology');
    expect(aapl?.assetType).toBe('stock');

    const spy = getTickerInfo('SPY');
    expect(spy).toBeDefined();
    expect(spy?.assetType).toBe('etf');

    const btc = getTickerInfo('BTC');
    expect(btc).toBeDefined();
    expect(btc?.assetType).toBe('crypto');
  });

  it('correctly lists distinct sectors and industries', () => {
    const sectors = getAllSectors();
    expect(sectors).toContain('Technology');
    expect(sectors).toContain('Financials');
    expect(sectors).toContain('Healthcare');
    expect(sectors).toContain('ETF');
    expect(sectors).toContain('Crypto');

    const techIndustries = getAllIndustries('Technology');
    expect(techIndustries).toContain('Semiconductors');
    expect(techIndustries).toContain('Consumer Electronics');
  });

  it('filters candles by date range correctly', () => {
    const sampleCandles: Candle[] = [
      { time: '2020-01-02', open: 100, high: 105, low: 99, close: 104, volume: 1000 },
      { time: '2020-01-03', open: 104, high: 108, low: 103, close: 107, volume: 1200 },
      { time: '2020-01-06', open: 107, high: 110, low: 106, close: 109, volume: 1100 },
      { time: '2020-01-07', open: 109, high: 112, low: 108, close: 111, volume: 1300 },
    ];

    const filtered = filterCandlesByDate(sampleCandles, '2020-01-03', '2020-01-06');
    expect(filtered.length).toBe(2);
    expect(filtered[0].time).toBe('2020-01-03');
    expect(filtered[1].time).toBe('2020-01-06');
  });

  it('finds the latest candle on or before a given simulation date', () => {
    const sampleCandles: Candle[] = [
      { time: '2020-01-02', open: 100, high: 105, low: 99, close: 104, volume: 1000 },
      { time: '2020-01-03', open: 104, high: 108, low: 103, close: 107, volume: 1200 },
      { time: '2020-01-06', open: 107, high: 110, low: 106, close: 109, volume: 1100 },
    ];

    const candle = getLatestCandleOnOrBefore(sampleCandles, '2020-01-05');
    expect(candle).toBeDefined();
    expect(candle?.time).toBe('2020-01-03');
    expect(candle?.close).toBe(107);
  });

  it('loads ticker data using fetch and caches the result', async () => {
    const mockCandles: Candle[] = [
      { time: '2023-01-03', open: 130, high: 132, low: 129, close: 131, volume: 5000 },
    ];

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCandles,
    } as unknown as Response);

    const result = await loadTickerData('TEST_TICKER');
    expect(result).toEqual(mockCandles);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    // Second call should return from cache without additional fetch
    const cachedResult = await loadTickerData('TEST_TICKER');
    expect(cachedResult).toEqual(mockCandles);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
