import { describe, it, expect } from 'vitest';
import { calculateMACD } from '../engine/indicators/macd';
import { calculateBollingerBands } from '../engine/indicators/bollinger';
import { calculateAnnualizedVolatility } from '../engine/risk/volatility';
import { normalizeWeights, isRebalanceDate } from '../engine/etf/etf-builder';
import { Candle } from '../model/types';

const mkCandles = (n: number, price = 100): Candle[] =>
  Array.from({ length: n }, (_, i) => ({
    time: `2024-01-${String(i + 1).padStart(2, '0')}`,
    open: price, high: price + 1, low: price - 1, close: price, volume: 1000,
  }));

describe('Bugfix Batch 9 – MACD/Bollinger/Volatility/ETF', () => {
  it('MACD rejects non-integer periods and fixes off-by-one', () => {
    const candles = mkCandles(35, 100);
    // 35 = 26+9 with -1 fix yields 2 points (34 gives 1), previously 35 gave 1 with old bug? Actually 35 should give 2
    const res = calculateMACD(candles, 12, 26, 9);
    expect(res.length).toBe(2);
    // fractional period should be rejected
    expect(calculateMACD(candles, 12.5 as any, 26, 9)).toEqual([]);
    expect(calculateMACD(candles, 12, 26.5 as any, 9)).toEqual([]);
  });

  it('Bollinger skips window where all closes NaN', () => {
    const bad: Candle[] = Array.from({ length: 20 }, (_, i) => ({
      time: `2024-01-${String(i + 1).padStart(2, '0')}`,
      open: 0, high: 0, low: 0, close: NaN as any, volume: 0,
    }));
    const res = calculateBollingerBands(bad, 20);
    expect(res).toEqual([]); // previously [{upper:0,middle:0}] fake
    // mixed valid still produces
    const mixed = mkCandles(20, 100);
    (mixed[5] as any).close = NaN;
    const res2 = calculateBollingerBands(mixed, 20);
    expect(res2.length).toBe(1);
    expect(Number.isFinite(res2[0].middle)).toBe(true);
  });

  it('annualized volatility guards negative/zero tradingDays', () => {
    const rets = [0.01, -0.01, 0.02];
    expect(calculateAnnualizedVolatility(rets, -252 as any)).toBe(0);
    expect(calculateAnnualizedVolatility(rets, 0 as any)).toBe(0);
    expect(calculateAnnualizedVolatility(rets, NaN as any)).toBe(0);
    expect(calculateAnnualizedVolatility(rets, Infinity as any)).toBe(0);
    expect(calculateAnnualizedVolatility(rets, 252)).toBeGreaterThan(0);
  });

  it('normalizeWeights handles Infinity without NaN', () => {
    const res = normalizeWeights([{ ticker: 'AAPL', targetWeight: Infinity as any }, { ticker: 'MSFT', targetWeight: 10 }]);
    expect(res.every(r => Number.isFinite(r.targetWeight))).toBe(true);
    expect(res.every(r => !Number.isNaN(r.targetWeight))).toBe(true);
    const sum = res.reduce((s, r) => s + r.targetWeight, 0);
    expect(sum).toBeCloseTo(100, 1);
    // Infinity should be treated as 0, so MSFT gets 100
    expect(res.find(r => r.ticker === 'AAPL')!.targetWeight).toBe(0);
    expect(res.find(r => r.ticker === 'MSFT')!.targetWeight).toBe(100);
  });

  it('isRebalanceDate validates invalid dates', () => {
    expect(isRebalanceDate('invalid', '2024-01-01', 'monthly')).toBe(false);
    expect(isRebalanceDate('2024-02-30', '2024-02-28', 'monthly')).toBe(false); // overflow invalid
    expect(isRebalanceDate('2024-02-28', 'invalid', 'monthly')).toBe(false);
    expect(isRebalanceDate('2024-02-01', '2024-01-01', 'monthly')).toBe(true);
    expect(isRebalanceDate('2024-01-15', '2024-01-01', 'monthly')).toBe(false);
  });
});
