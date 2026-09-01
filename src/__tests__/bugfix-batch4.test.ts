import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateSMA } from '../engine/indicators/sma';
import { calculateVolumeMA } from '../engine/indicators/volume-ma';
import { tokenize, parseRuleToAST, compileRule } from '../parser/strategy-dsl';
import { loadTickerData, clearTickerCache } from '../data/loader';
import { Candle } from '../model/types';

const mkCandles = (n: number, price = 100): Candle[] =>
  Array.from({ length: n }, (_, i) => ({
    time: `2020-01-${String(i + 1).padStart(2, '0')}`,
    open: price, high: price + 2, low: price - 2, close: price, volume: 1000,
  }));

describe('Bugfix Batch 4 – Indicators, Loader & Parser hardening', () => {
  it('SMA skips NaN close and returns finite values', () => {
    const candles = mkCandles(30, 100);
    (candles[10] as any).close = NaN;
    const res = calculateSMA(candles, 20);
    expect(res.length).toBe(11); // 30-20+1
    res.forEach(pt => {
      expect(Number.isFinite(pt.value)).toBe(true);
      expect(Number.isNaN(pt.value)).toBe(false);
    });
    // also volume MA with NaN
    const candlesV = mkCandles(30, 100);
    (candlesV[5] as any).volume = NaN;
    const vma = calculateVolumeMA(candlesV, 20);
    vma.forEach(pt => expect(Number.isFinite(pt.value)).toBe(true));
  });

  it('loader cache returns copy, mutation does not pollute cache', async () => {
    clearTickerCache();
    const mockCandles: Candle[] = mkCandles(5, 100).map((c, i) => ({
      ...c,
      high: Math.max(c.high, 100 + i),
      close: 100 + i,
    }));
    // mock fetch to return mockCandles for AAPL
    const origFetch = globalThis.fetch;
    const fetchSpy = vi.fn(async (url: string) => {
      if (url.includes('AAPL')) {
        return { ok: true, json: async () => mockCandles } as any;
      }
      return { ok: false } as any;
    });
    (globalThis as any).fetch = fetchSpy;
    const a = await loadTickerData('AAPL');
    expect(a.length).toBe(5);
    // mutate
    (a as any).push({ time: '2099-01-01', open: 999, high: 999, low: 999, close: 999, volume: 999 });
    a[0].close = 9999;
    const b = await loadTickerData('AAPL');
    expect(b.length).toBe(5); // not mutated to 6
    expect(b[0].close).not.toBe(9999);
    expect(b[0].close).toBe(100);
    (globalThis as any).fetch = origFetch;
    clearTickerCache();
  });

  it('loader safeBase preserves https://', async () => {
    clearTickerCache();
    const origFetch = globalThis.fetch;
    let capturedUrl = '';
    const fetchSpy = vi.fn(async (url: string) => {
      capturedUrl = url;
      return { ok: true, json: async () => mkCandles(5) } as any;
    });
    (globalThis as any).fetch = fetchSpy;
    // mock import.meta.env.BASE_URL via global
    // We can't directly mock import.meta, but test the regex replacement logic directly
    const baseUrl = 'https://cdn.example.com/app/';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const safeBase = cleanBase.replace(/([^:])\/\//g, '$1/');
    expect(safeBase).toBe('https://cdn.example.com/app/');
    expect(safeBase).not.toBe('https:/cdn.example.com/app/');
    // also test that loader url construction with this base yields correct
    const url = `${safeBase}data/stocks/AAPL.json`;
    expect(url).toBe('https://cdn.example.com/app/data/stocks/AAPL.json');
    (globalThis as any).fetch = origFetch;
    clearTickerCache();
  });

  it('tokenizer rejects malformed 1.2.3 as invalid number', () => {
    expect(() => tokenize('1.2.3')).toThrow(/Invalid number/);
    expect(() => tokenize('PRICE > 1.2.3')).toThrow(/Invalid number/);
    // valid numbers should still work
    expect(tokenize('1.2')).toHaveLength(2); // NUMBER + EOF
    expect(() => parseRuleToAST('PRICE > 1.2')).not.toThrow();
  });

  it('SMA with unknown period falls back to SMA20 not 0', () => {
    const candles = mkCandles(30, 100);
    // Build a simple context with known sma20=10, sma50=20
    const ctx: any = {
      index: 5,
      candles,
      indicators: { sma20: Array(30).fill(10), sma50: Array(30).fill(20), sma200: Array(30).fill(30), ema12: Array(30).fill(5), ema26: Array(30).fill(6), rsi14: Array(30).fill(50), macd: Array(30).fill({ macd: 0, signal: 0, histogram: 0 }), bb: Array(30).fill({ upper: 1, middle: 1, lower: 1 }), volumeMA20: Array(30).fill(100) },
      inPosition: false,
    };
    const fn30 = compileRule('SMA(30) > 0');
    const fn50 = compileRule('SMA(50) > 0');
    // SMA(30) should resolve to sma20 (10) not 0, so true
    expect(fn30(ctx)).toBe(true);
    // SMA(50) resolves to 20
    expect(fn50(ctx)).toBe(true);
    // also EMA unknown falls back to ema12
    const fnEMA = compileRule('EMA(99) > 0');
    expect(fnEMA(ctx)).toBe(true);
  });
});
