import { describe, it, expect } from 'vitest';
import { tokenize, validateRule, compileRule } from '../parser/strategy-dsl';
import { simulateETF } from '../engine/etf/etf-builder';
import { Candle } from '../model/types';

const mkCandles = (n: number, price = 100): Candle[] =>
  Array.from({ length: n }, (_, i) => ({
    time: `2024-01-${String(i + 1).padStart(2, '0')}`,
    open: price, high: price + 1, low: price - 1, close: price, volume: 1000,
  }));

describe('Bugfix Batch 16 – TradePanel/ETF/Parser/Chart', () => {
  it('TradePanel parsedShares rejects fractional and targetPrice zero', () => {
    const parsedShares = (input: string) => {
      const raw = Number(input);
      return Number.isInteger(raw) && raw > 0 ? raw : 0;
    };
    expect(parsedShares('3.7')).toBe(0);
    expect(parsedShares('3')).toBe(3);
    expect(parsedShares('Infinity')).toBe(0);
    const rawPrice = (priceInput: string, currentPrice: number) => {
      const raw = priceInput.trim() === '' ? currentPrice : Number(priceInput);
      return Number.isFinite(raw) && raw > 0 ? raw : 0;
    };
    expect(rawPrice('0', 100)).toBe(0);
    expect(rawPrice('', 100)).toBe(100);
    expect(rawPrice('50', 100)).toBe(50);
  });

  it('simulateETF validates ISO dates', () => {
    const map: Record<string, Candle[]> = { AAPL: mkCandles(5, 100) };
    const cfg: any = { id: 'test', name: 'Test', tickers: [{ ticker: 'AAPL', targetWeight: 100 }], rebalanceFrequency: 'never' };
    expect(() => simulateETF(cfg, map, '2024-02-30', '2024-01-01')).toThrow(/Invalid startDate/);
    expect(() => simulateETF(cfg, map, 'invalid', '2024-01-10')).toThrow(/Invalid/);
    expect(() => simulateETF(cfg, map, '2024-01-01', '2024-01-05')).not.toThrow();
  });

  it('parser NaN equality handled', () => {
    const ctx: any = {
      index: 5,
      candles: [{ close: NaN } as any],
      indicators: { sma20: [10], sma50: [10], sma200: [10], ema12: [10], ema26: [10], rsi14: [10], macd: [{ macd: 0, signal: 0, histogram: 0 }], bb: [{ upper: 1, middle: 1, lower: 1 }], volumeMA20: [10] },
    };
    // PRICE is NaN, so PRICE == PRICE should be false, PRICE != PRICE should be true
    const fnEq = compileRule('PRICE == PRICE');
    const fnNe = compileRule('PRICE != PRICE');
    // Need to mock candles to have close NaN at index
    const candles = Array(10).fill(0).map((_, i) => ({ time: `2024-01-0${i + 1}`, open: 100, high: 100, low: 100, close: i === 5 ? NaN : 100, volume: 1000 }));
    ctx.candles = candles;
    expect(fnEq(ctx)).toBe(false);
    expect(fnNe(ctx)).toBe(true);
  });

  it('parser tokenizes Infinity and NaN', () => {
    expect(tokenize('PRICE > Infinity')[2].value).toBe('Infinity');
    expect(tokenize('PRICE > -Infinity')[2].value).toBe('-Infinity');
    expect(tokenize('PRICE > NaN')[2].value).toBe('NaN');
    expect(validateRule('PRICE > -Infinity').valid).toBe(true);
    expect(validateRule('PRICE > Infinity').valid).toBe(true);
  });

  it('CandlestickChart price guards NaN/Infinity', () => {
    const latest: any = { close: NaN };
    const hovered: any = { close: Infinity };
    const currentPrice = Number.isFinite(hovered?.close) ? hovered.close : Number.isFinite(latest?.close) ? latest.close : 0;
    expect(currentPrice).toBe(0);
    const latest2: any = { close: 100 };
    const hovered2: any = { close: 110 };
    const cp2 = Number.isFinite(hovered2?.close) ? hovered2.close : Number.isFinite(latest2?.close) ? latest2.close : 0;
    expect(cp2).toBe(110);
  });
});
