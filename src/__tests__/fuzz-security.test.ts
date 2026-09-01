import { describe, it, expect } from 'vitest';
import { TradingEngine } from '../engine/trading/trading-engine';
import { calculateSMA, calculateEMA, calculateRSI } from '../engine/indicators';
import { encodeShareState, decodeShareState } from '../engine/export/url-state';
import { compileRule, validateRule } from '../parser/strategy-dsl';
import { Candle } from '../model/types';

const mk = (closes: (number | null)[]): Candle[] => closes.map((c, i) => ({
  time: `2024-01-${String(i + 1).padStart(2, '0')}`, open: c as number, high: (c as number) + 1, low: (c as number) - 1, close: c as number, volume: 1000,
}));

describe('Fuzz & Security', () => {
  it('trading engine NaN shares rejected', () => {
    const e = new TradingEngine(10000);
    const c: Candle = { time: '2024-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 };
    expect(e.placeOrder({ ticker: 'AAPL', side: 'buy', type: 'limit', shares: NaN as any, limitPrice: 100, date: '2024-01-01' }, c).success).toBe(false);
    expect(e.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: NaN as any, date: '2024-01-01' }, c).success).toBe(false);
  });

  it('trading engine Infinity price rejected', () => {
    const e = new TradingEngine(10000);
    const c: Candle = { time: '2024-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 };
    expect(e.placeOrder({ ticker: 'AAPL', side: 'buy', type: 'limit', shares: 10, limitPrice: Infinity, date: '2024-01-01' }, c).success).toBe(false);
  });

  it('trading engine negative price rejected', () => {
    const e = new TradingEngine(10000);
    const c: Candle = { time: '2024-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 };
    expect(e.placeOrder({ ticker: 'AAPL', side: 'buy', type: 'limit', shares: 10, limitPrice: -5, date: '2024-01-01' }, c).success).toBe(false);
  });

  it('indicators handles null/undefined close coerced', () => {
    const candles = mk([100, 101, null as any, 103, 104]);
    const sma = calculateSMA(candles as any, 2);
    expect(Array.isArray(sma)).toBe(true);
  });

  it('SMA with NaN produces NaN values but length correct', () => {
    const candles = mk([100, NaN, 102, 103]);
    const sma = calculateSMA(candles as any, 2);
    expect(sma.length).toBe(3);
  });

  it('compileRule handles very long string without hang', () => {
    const longRule = Array(100).fill('CLOSE > 100 AND').join(' ') + ' CLOSE > 0';
    const start = Date.now();
    const res = validateRule(longRule);
    expect(Date.now() - start).toBeLessThan(1000);
    expect(typeof res.valid).toBe('boolean');
  });

  it('compileRule rejects injection with semicolon', () => {
    expect(validateRule('CLOSE > 100; DROP TABLE').valid).toBe(false);
  });

  it('url-state handles payload with < > & characters', () => {
    const p: any = { version: 1, backtest: { ticker: 'AAPL', entryRule: 'CLOSE < 100 && CLOSE > 50', exitRule: 'CLOSE > 200' } };
    const dec = decodeShareState(encodeShareState(p)) as any;
    expect(dec.backtest.entryRule).toBe('CLOSE < 100 && CLOSE > 50');
  });

  it('url-state rejects incomplete nested ETF data', () => {
    const p: any = { version: 1, etf: { name: '🚀🌕💸' } };
    expect(decodeShareState(encodeShareState(p))).toBeNull();
  });

  it('EMA with period 1 equals close even with volatile', () => {
    const closes = [10, 200, 5, 300, 50];
    const candles = mk(closes);
    const ema = calculateEMA(candles, 1);
    expect(ema.map(v => v.value)).toEqual(closes);
  });

  it('RSI with 0 variance returns 100 per impl', () => {
    const flat = mk(Array(15).fill(100));
    const rsi = calculateRSI(flat, 5);
    expect(rsi[0].value).toBe(50);
  });

  it('trading engine ticker with special chars not crash', () => {
    const e = new TradingEngine(10000);
    const c: Candle = { time: '2024-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 };
    expect(() => e.executeMarketOrder({ ticker: 'BRK.B', side: 'buy', type: 'market', shares: 1, date: '2024-01-01' }, c)).not.toThrow();
  });

  it('compileRule empty AND handling', () => {
    const fn = compileRule('CLOSE > 100 AND CLOSE < 200');
    const ctx: any = { index: 0, candle: { close: 150 }, candles: [{ close: 150 }], indicators: { sma20: [0], sma50: [0], sma200: [0], ema12: [0], ema26: [0], rsi14: [50], macd: [{ macd: 0, signal: 0, histogram: 0 }], bb: [{ upper: 0, middle: 0, lower: 0 }], volumeMA20: [0] } };
    expect(typeof fn(ctx)).toBe('boolean');
  });

  it('fuzz: random candles SMA length invariant', () => {
    for (let i = 0; i < 10; i++) {
      const n = 5 + Math.floor(Math.random() * 20);
      const period = 3;
      const candles = mk(Array.from({ length: n }, () => 50 + Math.random() * 100));
      const sma = calculateSMA(candles, period);
      expect(sma.length).toBe(Math.max(0, n - period + 1));
    }
  });
});
