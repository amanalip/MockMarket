import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CORE_TICKERS, getTickerInfo, getAllSectors, getAllIndustries } from '../model/tickers';
import { clearTickerCache, loadLatestCandlesOnOrBefore, loadTickerData, filterCandlesByDate, getLatestCandleOnOrBefore } from '../data/loader';
import { Candle } from '../model/types';
import { validateCandles } from '../data/candle-validation';

describe('Ticker Metadata & Data Loader', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    clearTickerCache();
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

  it.each([
    [{ time: '2024-02-30', open: 1, high: 1, low: 1, close: 1, volume: 0 }, 'invalid time'],
    [{ time: '2024-01-01', open: 0, high: 1, low: 1, close: 1, volume: 0 }, 'field open'],
    [{ time: '2024-01-01', open: 2, high: 1, low: 1, close: 1, volume: 0 }, 'high must'],
    [{ time: '2024-01-01', open: 1, high: 1, low: 1, close: 1, volume: -1 }, 'field volume'],
  ])('rejects malformed complete candle fields with useful errors', (candle, message) => {
    expect(() => validateCandles([candle], 'TEST')).toThrow(message);
  });

  it('rejects duplicate and unsorted candle dates', () => {
    const candle = (time: string): Candle => ({ time, open: 1, high: 1, low: 1, close: 1, volume: 0 });
    expect(() => validateCandles([candle('2024-01-01'), candle('2024-01-01')], 'TEST')).toThrow('duplicate time');
    expect(() => validateCandles([candle('2024-01-02'), candle('2024-01-01')], 'TEST')).toThrow('unsorted time');
  });

  it('surfaces load-time validation errors instead of filtering malformed candles', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ time: '2024-01-01', open: 10, high: 9, low: 8, close: 10, volume: 1 }],
    } as unknown as Response);

    await expect(loadTickerData('INVALID_TEST')).rejects.toThrow(
      'Invalid candle data for INVALID_TEST: candle 0 high must be greater than or equal to open and close'
    );
  });

  it('loads each ticker own latest candle and reports unavailable prices', async () => {
    const data: Record<string, Candle[]> = {
      AAA: [
        { time: '2024-01-05', open: 100, high: 100, low: 100, close: 100, volume: 1 },
        { time: '2024-01-08', open: 110, high: 110, low: 110, close: 110, volume: 1 },
      ],
      BBB: [{ time: '2024-01-05', open: 200, high: 200, low: 200, close: 200, volume: 1 }],
      CCC: [{ time: '2024-01-09', open: 300, high: 300, low: 300, close: 300, volume: 1 }],
    };
    globalThis.fetch = vi.fn<typeof fetch>(async (input) => {
      const url = input instanceof Request ? input.url : String(input);
      const ticker = /([^/]+)\.json$/.exec(url)?.[1] || '';
      return { ok: true, json: async () => data[ticker] } as Response;
    });

    const result = await loadLatestCandlesOnOrBefore(['aaa', 'BBB', 'CCC'], '2024-01-08');

    expect(result.AAA.status).toBe('available');
    expect(result.AAA.status === 'available' && result.AAA.candle.close).toBe(110);
    expect(result.BBB.status === 'available' && result.BBB.candle).toMatchObject({ time: '2024-01-05', close: 200 });
    expect(result.CCC).toMatchObject({ status: 'unavailable', reason: 'no-candle-on-or-before' });
  });
});
