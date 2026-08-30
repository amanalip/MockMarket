import { describe, it, expect } from 'vitest';
import { calculateBeta } from '../engine/risk/beta';
import { calculatePerformanceAttribution } from '../engine/risk/attribution';
import { calculateValueAtRisk } from '../engine/risk/var';
import { calculateMaxDrawdown } from '../engine/risk/drawdown';
import { calculateTimeMachine } from '../engine/timemachine/timemachine';
import { Candle } from '../model/types';

const mkCandle = (time: string, close: number): Candle => ({ time, open: close, high: close + 1, low: close - 1, close, volume: 1000 });
const mkCandles = (start: string, n: number, price = 100): Candle[] =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i);
    return mkCandle(d.toISOString().split('T')[0], price + i);
  });

describe('Bugfix Batch 6 – Beta, Attribution, VaR, Drawdown, TimeMachine', () => {
  it('beta slices only n, ignores corrupt beyond n', () => {
    const port = [0.01, 0.02, 0.03, 0.04, 0.05, ...Array(95).fill(0), NaN as any];
    const bench = [0.01, 0.02, 0.03, 0.04, 0.05];
    // n=5, first 5 are perfect correlation => beta ~1, not 0
    const beta = calculateBeta(port, bench);
    expect(beta).toBeCloseTo(1, 1);
    expect(beta).not.toBe(0);
    // also extreme filtered
    expect(calculateBeta([0.01, 0.02, 0.03, 0.04, 10 as any], bench)).toBe(0);
  });

  it('attribution handles NaN PnL and null positions', () => {
    const pos: any = {
      AAPL: { ticker: 'AAPL', unrealizedPnL: NaN, realizedPnL: 10, currentValue: 1000, shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 100, unrealizedPnLPercent: 0 },
      MSFT: { ticker: 'MSFT', unrealizedPnL: 20, realizedPnL: 30, currentValue: 2000, shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 100, unrealizedPnLPercent: 0 },
    };
    const res = calculatePerformanceAttribution(pos, 10000);
    expect(res.length).toBe(2);
    expect(res.every(r => Number.isFinite(r.pnl) && Number.isFinite(r.contributionPercent))).toBe(true);
    expect(() => calculatePerformanceAttribution(null as any, 10000)).not.toThrow();
    expect(calculatePerformanceAttribution(null as any, 10000)).toEqual([]);
    // holdings with NaN should be filtered if startingCash invalid
    expect(calculatePerformanceAttribution(pos, NaN as any)).toEqual([]);
  });

  it('VaR filters NaN before sort', () => {
    const rets = [-0.02, -0.01, 0, 0.01, 0.02, NaN as any, 0.01];
    const v = calculateValueAtRisk(rets, 0.95);
    expect(Number.isFinite(v)).toBe(true);
    expect(v).toBeGreaterThan(0);
    // with only NaNs, should be 0 not NaN
    expect(calculateValueAtRisk([NaN as any, NaN as any, NaN as any, NaN as any, NaN as any], 0.95)).toBe(0);
  });

  it('maxDrawdown handles NaN and sorts by date', () => {
    const unsorted = [
      { date: '2024-01-03', value: 50 },
      { date: '2024-01-01', value: NaN as any },
      { date: '2024-01-02', value: 100 },
    ];
    const res = calculateMaxDrawdown(unsorted as any);
    // NaN replaced with peak (100), then sorted => 100 at 01-02, 50 at 01-03 => 50% drawdown, not 0
    expect(res.maxDrawdownPercent).toBe(50);
    // sorted drawdownSeries first date should be earliest
    expect(res.drawdownSeries[0].date).toBe('2024-01-01');
  });

  it('timeMachine guards DCA Infinity/NaN and zero cash invested', () => {
    const candles = mkCandles('2024-01-01', 10, 100);
    const bench = mkCandles('2024-01-01', 10, 100);
    // corrupt one candle close NaN
    (candles[5] as any).close = NaN;
    const res = calculateTimeMachine(candles, bench, {
      ticker: 'AAPL', startDate: '2024-01-01', endDate: '2024-01-10',
      initialAmount: 1000, dcaAmount: Infinity as any, dcaInterval: 'weekly',
    });
    // should not produce Infinity
    expect(Number.isFinite(res.finalAssetValue)).toBe(true);
    expect(res.growthCurve.every(pt => Number.isFinite(pt.assetValue))).toBe(true);
    // zero initialAmount case
    const res2 = calculateTimeMachine(candles, bench, {
      ticker: 'AAPL', startDate: '2024-01-01', endDate: '2024-01-10',
      initialAmount: 0, dcaAmount: 100, dcaInterval: 'monthly',
    });
    expect(Number.isFinite(res2.totalReturnPercent)).toBe(true);
    expect(Number.isNaN(res2.totalReturnPercent)).toBe(false);
  });
});
