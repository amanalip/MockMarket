import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadTickerData, fetchTickers, filterCandlesByDate, getLatestCandleOnOrBefore } from '../data/loader';
import { CORE_TICKERS, getTickerInfo, getAllSectors } from '../model/tickers';
import { validateRule, compileRule, tokenize, parseRuleToAST } from '../parser/strategy-dsl';
import { Candle } from '../model/types';

describe('Loader & Strategy Extended', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('fetchTickers returns CORE_TICKERS on fetch fail', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network'));
    const res = await fetchTickers();
    expect(res.length).toBe(CORE_TICKERS.length);
  });

  it('loadTickerData caches per ticker uppercase', async () => {
    const fake: any = [{ time: '2020-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 }];
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => fake } as any);
    await loadTickerData('cache_test_xyz');
    await loadTickerData('CACHE_TEST_XYZ');
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('loadTickerData handles BRK.B dot ticker URL', async () => {
    const fake: any = [{ time: '2020-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 }];
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => fake } as any);
    const res = await loadTickerData('BRK.B');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('BRK.B'));
    expect(res).toEqual(fake);
    spy.mockRestore();
  });

  it('loadTickerData etf subfolder for SPY', async () => {
    const fake: any = [{ time: '2020-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 }];
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => fake } as any);
    await loadTickerData('SPY');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('etfs/SPY'));
    spy.mockRestore();
  });

  it('loadTickerData crypto subfolder for BTC', async () => {
    const fake: any = [{ time: '2020-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 }];
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => fake } as any);
    await loadTickerData('BTC');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('crypto/BTC'));
    spy.mockRestore();
  });

  it('filterCandlesByDate inclusive', () => {
    const candles: Candle[] = [
      { time: '2020-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { time: '2020-01-02', open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { time: '2020-01-03', open: 100, high: 100, low: 100, close: 100, volume: 1000 },
    ];
    expect(filterCandlesByDate(candles, '2020-01-02', '2020-01-03').length).toBe(2);
  });

  it('getLatestCandleOnOrBefore exact and before', () => {
    const candles: Candle[] = [
      { time: '2020-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { time: '2020-01-03', open: 100, high: 100, low: 100, close: 100, volume: 1000 },
    ];
    expect(getLatestCandleOnOrBefore(candles, '2020-01-03')?.time).toBe('2020-01-03');
    expect(getLatestCandleOnOrBefore(candles, '2020-01-02')?.time).toBe('2020-01-01');
    expect(getLatestCandleOnOrBefore(candles, '2019-12-31')).toBeUndefined();
  });

  it('getTickerInfo case insensitive', () => {
    expect(getTickerInfo('aapl')?.ticker).toBe('AAPL');
    expect(getTickerInfo('spy')?.assetType).toBe('etf');
  });

  it('getAllSectors includes at least 5', () => {
    expect(getAllSectors().length).toBeGreaterThanOrEqual(5);
  });

  it('tokenize handles all operators', () => {
    expect(tokenize('CLOSE >= 100').some(t => t.value === '>=')).toBe(true);
    expect(tokenize('CLOSE <= 100').some(t => t.value === '<=')).toBe(true);
    expect(tokenize('CLOSE == 100').some(t => t.value === '==')).toBe(true);
    expect(tokenize('CLOSE != 100').some(t => t.value === '!=')).toBe(true);
  });

  it('tokenize AND OR NOT case insensitive', () => {
    expect(tokenize('close and rsi > 50').some(t => t.value === 'AND')).toBe(true);
    expect(tokenize('not close > 100').some(t => t.value === 'NOT')).toBe(true);
  });

  it('parseRule handles nested parens', () => {
    expect(() => parseRuleToAST('(CLOSE > 100 AND RSI() < 30) OR SMA(20) > 50')).not.toThrow();
  });

  it('validateRule empty false', () => {
    expect(validateRule('').valid).toBe(false);
    expect(validateRule('   ').valid).toBe(false);
  });

  it('compileRule handles SMA param', () => {
    const fn = compileRule('SMA(50) > 100');
    expect(typeof fn).toBe('function');
  });

  it('compileRule crosses functions', () => {
    const fn = compileRule('crosses_above(SMA(50), SMA(200))');
    expect(typeof fn).toBe('function');
  });

  it('validateRule detects missing paren', () => {
    expect(validateRule('SMA(50 > 100').valid).toBe(false);
  });

  it('loadTickerData unknown throws', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as any);
    await expect(loadTickerData('UNKNOWN_TICKER_999')).rejects.toThrow();
  });

  it('filterCandles empty returns empty', () => {
    expect(filterCandlesByDate([], '2020-01-01', '2020-01-02')).toEqual([]);
  });

  it('tokenize number with dot', () => {
    const toks = tokenize('10.5 > 5');
    expect(toks[0].value).toBe('10.5');
  });

  it('compileRule handles = as equality', () => {
    const fn = compileRule('CLOSE = 100');
    const ctx: any = { index: 0, candle: { close: 100 }, candles: [{ close: 100 }], indicators: { sma20: [100], sma50: [100], sma200: [100], ema12: [100], ema26: [100], rsi14: [50], macd: [{ macd: 0, signal: 0, histogram: 0 }], bb: [{ upper: 110, middle: 100, lower: 90 }], volumeMA20: [1000] } };
    expect(fn(ctx)).toBe(true);
  });

  it('getTickerInfo unknown returns undefined', () => {
    expect(getTickerInfo('FAKE999')).toBeUndefined();
  });

  it('CORE_TICKERS includes crypto and etf', () => {
    expect(CORE_TICKERS.some(t => t.assetType === 'crypto')).toBe(true);
    expect(CORE_TICKERS.some(t => t.assetType === 'etf')).toBe(true);
  });

  it('tokenize throws on unexpected char', () => {
    expect(() => tokenize('CLOSE @ 100')).toThrow();
  });

  it('parseRule handles volume', () => {
    expect(validateRule('VOLUME > 1000000').valid).toBe(true);
  });

  it('filterCandlesByDate no bounds returns all', () => {
    const candles: Candle[] = [{ time: '2020-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 }];
    expect(filterCandlesByDate(candles).length).toBe(1);
  });
});
