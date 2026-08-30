import { describe, it, expect } from 'vitest';
import { calculateReturns, calculateAnnualizedVolatility } from '../engine/risk/volatility';
import { calculateSharpeRatio, calculateSortinoRatio } from '../engine/risk/var';
import { calculateMaxDrawdown } from '../engine/risk/drawdown';
import { calculateDiversification } from '../engine/risk/diversification';

describe('Bugfix Batch 3 – Risk & Volatility hardening', () => {
  it('Sharpe ratio with corrupt extreme returns returns finite, not NaN', () => {
    const corrupt = [-1.5, -1.5, -1.5, -1.5, -1.5];
    const sharpe = calculateSharpeRatio(corrupt as any);
    expect(Number.isFinite(sharpe)).toBe(true);
    expect(Number.isNaN(sharpe)).toBe(false);
    // extreme uniform -1.5 is clamped/filtered to 0
    expect(sharpe).toBe(0);

    const withNaN = [0.01, NaN, 0.02, Infinity, 0.01, 0.02, 0.01] as any;
    const sharpe2 = calculateSharpeRatio(withNaN);
    expect(Number.isFinite(sharpe2)).toBe(true);
    expect(Number.isNaN(sharpe2)).toBe(false);
  });

  it('Sortino ratio with corrupt returns returns finite', () => {
    const corrupt = [NaN, Infinity, -10, -10, -10] as any;
    const sortino = calculateSortinoRatio(corrupt);
    expect(Number.isFinite(sortino)).toBe(true);
    expect(Number.isNaN(sortino)).toBe(false);
  });

  it('calculateReturns skips NaN pairs instead of pushing 0', () => {
    const rets = calculateReturns([100, NaN as any, 100]);
    // both pairs contain NaN, should be empty (skip) not [0,0]
    expect(rets).toEqual([]);
    expect(rets.includes(0 as any)).toBe(false);

    const rets2 = calculateReturns([100, 110, NaN as any, 121]);
    // 100->110 valid 0.1, 110->NaN skip, NaN->121 skip => only 0.1
    expect(rets2).toEqual([0.1]);

    const vol = calculateAnnualizedVolatility(rets2);
    expect(Number.isFinite(vol)).toBe(true);
  });

  it('maxDrawdown does not report 100% for single NaN value', () => {
    const series = [
      { date: '2024-01-01', value: 100 },
      { date: '2024-01-02', value: NaN as any },
      { date: '2024-01-03', value: 90 },
    ];
    const res = calculateMaxDrawdown(series as any);
    expect(res.maxDrawdownPercent).not.toBe(100);
    expect(Number.isFinite(res.maxDrawdownPercent)).toBe(true);
    // should be at most 10% (100->90) not 100% fake from NaN->0
    expect(res.maxDrawdownPercent).toBeLessThan(20);
    expect(res.maxDrawdownPercent).toBeGreaterThanOrEqual(0);
  });

  it('diversification with negative cash treats cash as 0 and caps percents', () => {
    const positions: any = {
      AAPL: { ticker: 'AAPL', shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 100, currentValue: 1000, unrealizedPnL: 0, unrealizedPnLPercent: 0, realizedPnL: 0 },
    };
    const res = calculateDiversification(positions, -200 as any);
    // negative cash should be ignored, total = 1000, AAPL 100%
    expect(res.tickerAllocations.find(t => t.ticker === 'CASH')).toBeUndefined();
    expect(res.tickerAllocations[0].percent).toBeCloseTo(100, 1);
    expect(res.sectorConcentrationHHI).toBeLessThanOrEqual(10000);
    expect(res.sectorConcentrationHHI).toBeGreaterThan(0);
    // percents sum ~100
    const sum = res.tickerAllocations.reduce((s, t) => s + t.percent, 0);
    expect(sum).toBeCloseTo(100, 1);
  });
});
