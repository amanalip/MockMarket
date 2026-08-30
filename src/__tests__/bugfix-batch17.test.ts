import { describe, it, expect } from 'vitest';
import { getLatestCandleOnOrBefore, filterCandlesByDate } from '../data/loader';
import { calculateReturns } from '../engine/risk/volatility';
import { calculateBeta } from '../engine/risk/beta';
import { Candle } from '../model/types';

const mkCandles = (dates: string[], price = 100): Candle[] => dates.map(d => ({ time: d, open: price, high: price, low: price, close: price, volume: 1000 }));

describe('Bugfix Batch 17 – Loader/Beta/Volatility', () => {
  it('getLatestCandle guards invalid date', () => {
    const candles = mkCandles(['2024-01-01', '2024-01-05']);
    expect(getLatestCandleOnOrBefore(candles, 'invalid' as any)).toBeUndefined();
    expect(getLatestCandleOnOrBefore(candles, '2024-02-30' as any)).toBeUndefined();
    expect(getLatestCandleOnOrBefore(candles, '2024-01-03')).toEqual(candles[0]);
  });

  it('filterCandlesByDate handles invalid start/end', () => {
    const candles = mkCandles(['2024-01-01', '2024-01-10', '2024-02-01']);
    // invalid start/end should be ignored (not filter), so at least 2 remain
    expect(filterCandlesByDate(candles, 'invalid', '2024-12-31').length).toBeGreaterThanOrEqual(2);
    expect(filterCandlesByDate(candles, '2024-01-05', 'invalid').length).toBeGreaterThanOrEqual(2);
    // valid filter still works
    expect(filterCandlesByDate(candles, '2024-01-05', '2024-01-15').length).toBe(1);
  });

  it('calculateReturns skips negative and NaN', () => {
    expect(calculateReturns([10, -5, 10])).toEqual([]);
    expect(calculateReturns([100, NaN as any, 110])).toEqual([]);
    expect(calculateReturns([100, 110])).toEqual([0.1]);
  });

  it('beta handles NaN beyond n', () => {
    const port = [0.01, 0.02, 0.03, 0.04, 0.05, NaN as any, NaN as any];
    const bench = [0.01, 0.02, 0.03, 0.04, 0.05];
    const beta = calculateBeta(port, bench);
    expect(beta).toBeCloseTo(1, 1);
  });

  it('loader handles empty candles', () => {
    expect(getLatestCandleOnOrBefore([], '2024-01-01')).toBeUndefined();
    expect(filterCandlesByDate([], '2024-01-01', '2024-12-31')).toEqual([]);
  });
});
