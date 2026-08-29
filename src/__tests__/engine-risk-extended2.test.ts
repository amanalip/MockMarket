import { describe, it, expect } from 'vitest';
import { calculateSMA, calculateEMA, calculateRSI } from '../engine/indicators';
import { calculateReturns, calculateAnnualizedVolatility } from '../engine/risk/volatility';
import { calculateBeta } from '../engine/risk/beta';
import { calculateValueAtRisk } from '../engine/risk/var';
import { calculateMaxDrawdown } from '../engine/risk/drawdown';
import { simulateETF } from '../engine/etf/etf-builder';
import { Candle } from '../model/types';

const mk = (n: number): Candle[] => Array.from({ length: n }, (_, i) => ({ time: `2024-01-${String(i + 1).padStart(2,'0')}`, open: 100, high: 100, low: 100, close: 100, volume: 1000 }));

describe('Engine Risk Extended2', () => {
  it('SMA with NaN', () => {
    const c = mk(5); (c[1] as any).close = NaN;
    expect(calculateSMA(c, 3).length).toBe(3);
  });

  it('EMA with flat', () => {
    const e = calculateEMA(mk(10), 5);
    expect(e.every(v => v.value === 100)).toBe(true);
  });

  it('RSI single value impossible', () => {
    expect(calculateRSI(mk(5), 10)).toEqual([]);
  });

  it('returns empty', () => {
    expect(calculateReturns([])).toEqual([]);
  });

  it('vol 0 for 1 return', () => {
    expect(calculateAnnualizedVolatility([0.01])).toBe(0);
  });

  it('beta with n<2 returns 1', () => {
    expect(calculateBeta([0.01], [0.01])).toBe(1);
  });

  it('VaR 0 for <5', () => {
    expect(calculateValueAtRisk([0.01, 0.02])).toBe(0);
  });

  it('drawdown empty', () => {
    expect(calculateMaxDrawdown([]).maxDrawdownPercent).toBe(0);
  });

  it('drawdown flat 0', () => {
    expect(calculateMaxDrawdown([{ date: '2020-01-01', value: 100 }, { date: '2020-01-02', value: 100 }]).maxDrawdownPercent).toBe(0);
  });

  it('drawdown decreasing', () => {
    expect(calculateMaxDrawdown([{ date: '2020-01-01', value: 100 }, { date: '2020-01-02', value: 50 }]).maxDrawdownPercent).toBe(50);
  });

  it('simulateETF throws no overlapping', () => {
    const map: any = { AAPL: [{ time: '2020-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 }], MSFT: [{ time: '2020-01-02', open: 100, high: 100, low: 100, close: 100, volume: 1000 }] };
    expect(() => simulateETF({ id: '1', name: 'X', tickers: [{ ticker: 'AAPL', targetWeight: 50 }, { ticker: 'MSFT', targetWeight: 50 }], rebalanceFrequency: 'never', createdAt: '2020-01-01' }, map)).toThrow();
  });

  it('SMA 50 on 100 candles', () => {
    expect(calculateSMA(mk(100), 50).length).toBe(51);
  });

  it('RSI bounded', () => {
    const rsi = calculateRSI(mk(20), 5);
    rsi.forEach(r => { expect(r.value).toBeGreaterThanOrEqual(0); expect(r.value).toBeLessThanOrEqual(100); });
  });

  it('vol positive for varied', () => {
    expect(calculateAnnualizedVolatility([0.01, -0.02, 0.03])).toBeGreaterThan(0);
  });

  it('beta perfect 1', () => {
    const a = [0.01, 0.02, 0.03];
    expect(calculateBeta(a, a)).toBeCloseTo(1, 1);
  });

  it('VaR 99% vs 95% higher', () => {
    const rets = [-0.1, -0.05, 0, 0.05, 0.1, 0.2];
    expect(calculateValueAtRisk(rets, 0.99)).toBeGreaterThanOrEqual(calculateValueAtRisk(rets, 0.95));
  });

  it('SMA with period 0 returns []', () => {
    expect(calculateSMA(mk(10), 0)).toEqual([]);
  });

  it('EMA period 0', () => {
    expect(calculateEMA(mk(10), 0)).toEqual([]);
  });

  it('RSI period 0', () => {
    expect(calculateRSI(mk(10), 0)).toEqual([]);
  });

  it('simulateETF with 1 ticker', () => {
    const dates = Array.from({ length: 10 }, (_, i) => `2020-01-${String(i + 1).padStart(2,'0')}`);
    const map: any = { AAPL: dates.map(d => ({ time: d, open: 100, high: 100, low: 100, close: 100, volume: 1000 })) };
    const res = simulateETF({ id: '1', name: 'Solo', tickers: [{ ticker: 'AAPL', targetWeight: 100 }], rebalanceFrequency: 'never', createdAt: '2020-01-01' }, map);
    expect(res.navHistory.length).toBe(10);
  });

  it('MaxDrawdown after peak', () => {
    const s = [{ date: '2020-01-01', value: 100 }, { date: '2020-01-02', value: 200 }, { date: '2020-01-03', value: 150 }];
    expect(calculateMaxDrawdown(s).maxDrawdownPercent).toBe(25);
  });

  it('returns handles negative', () => {
    expect(calculateReturns([100, 50])[0]).toBe(-0.5);
  });

  it('SMA correctness', () => {
    const c: Candle[] = [{ time: '2024-01-01', open: 10, high: 10, low: 10, close: 10, volume: 1000 }, { time: '2024-01-02', open: 20, high: 20, low: 20, close: 20, volume: 1000 }, { time: '2024-01-03', open: 30, high: 30, low: 30, close: 30, volume: 1000 }];
    expect(calculateSMA(c, 2)[0].value).toBe(15);
  });

  it('EMA with 12', () => {
    expect(calculateEMA(mk(20), 12).length).toBe(9);
  });

  it('RSI monotonic up high', () => {
    const up = Array.from({ length: 20 }, (_, i) => ({ time: `2024-01-${String(i + 1).padStart(2,'0')}`, open: 100 + i, high: 100 + i, low: 100 + i, close: 100 + i, volume: 1000 } as Candle));
    const rsi = calculateRSI(up, 5);
    expect(rsi[rsi.length - 1].value).toBeGreaterThan(70);
  });
});
