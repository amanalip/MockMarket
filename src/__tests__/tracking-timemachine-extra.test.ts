import { describe, it, expect } from 'vitest';
import { calculateTrackingError } from '../engine/etf/tracking-error';
import { calculateTimeMachine } from '../engine/timemachine/timemachine';
import { Candle } from '../model/types';

const mk = (n: number, price: number, volGrowth = 0): Candle[] =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date('2020-01-01'); d.setDate(d.getDate() + i);
    const p = price + i * volGrowth + Math.sin(i) * 2;
    return { time: d.toISOString().split('T')[0], open: p, high: p + 1, low: p - 1, close: p, volume: 1e6 };
  });

describe('Tracking Error & TimeMachine Extra', () => {
  it('tracking error <5 returns 0/1 fallback', () => {
    expect(calculateTrackingError([100, 101], [100, 101])).toEqual({ trackingErrorPercent: 0, correlation: 1 });
    expect(calculateTrackingError([], [])).toEqual({ trackingErrorPercent: 0, correlation: 1 });
  });

  it('tracking error perfect correlation ~1 when series identical', () => {
    const s = Array.from({ length: 20 }, (_, i) => 100 + i);
    const r = calculateTrackingError(s, s);
    expect(r.correlation).toBeCloseTo(1, 1);
    expect(r.trackingErrorPercent).toBe(0);
  });

  it('tracking error high when series diverge', () => {
    const a = Array.from({ length: 20 }, (_, i) => 100 + i);
    const b = Array.from({ length: 20 }, (_, i) => 100 + (i % 2 ? 10 : -10));
    const r = calculateTrackingError(a, b);
    expect(r.trackingErrorPercent).toBeGreaterThan(0);
    expect(Math.abs(r.correlation)).toBeLessThan(1);
  });

  it('tracking error flat both series -> correlation 0 (den 0)', () => {
    const flat = Array(20).fill(100);
    const r = calculateTrackingError(flat, flat);
    expect(r.correlation).toBe(0);
    expect(r.trackingErrorPercent).toBe(0);
  });

  it('tracking error length mismatch truncates', () => {
    const a = Array.from({ length: 30 }, (_, i) => 100 + i);
    const b = Array.from({ length: 10 }, (_, i) => 100 + i);
    const r = calculateTrackingError(a, b);
    expect(r.correlation).toBeDefined();
  });

  it('timemachine weekly DCA counts correct weeks', () => {
    const candles = mk(28, 100, 0.5); // 4 weeks daily
    const bench = mk(28, 100, 0.5);
    const res = calculateTimeMachine(candles, bench, {
      ticker: 'AAPL', startDate: candles[0].time, endDate: candles[candles.length - 1].time,
      initialAmount: 1000, dcaAmount: 100, dcaInterval: 'weekly',
    });
    // at least 3 weekly contributions + initial
    expect(res.totalCashInvested).toBeGreaterThanOrEqual(1300);
    expect(res.growthCurve.length).toBe(28);
  });

  it('timemachine monthly DCA on month boundary triggers', () => {
    const candles: Candle[] = [
      { time: '2020-01-15', open: 100, high: 100, low: 100, close: 100, volume: 1e6 },
      { time: '2020-01-31', open: 100, high: 100, low: 100, close: 100, volume: 1e6 },
      { time: '2020-02-01', open: 100, high: 100, low: 100, close: 100, volume: 1e6 },
      { time: '2020-02-15', open: 100, high: 100, low: 100, close: 100, volume: 1e6 },
      { time: '2020-03-01', open: 100, high: 100, low: 100, close: 100, volume: 1e6 },
    ];
    const res = calculateTimeMachine(candles, candles, {
      ticker: 'AAPL', startDate: '2020-01-15', endDate: '2020-03-01',
      initialAmount: 1000, dcaAmount: 500, dcaInterval: 'monthly',
    });
    // Jan->Feb and Feb->Mar = 2 contributions
    expect(res.totalCashInvested).toBe(2000);
  });

  it('timemachine DCA zero amount ignored', () => {
    const candles = mk(10, 100);
    const res = calculateTimeMachine(candles, candles, {
      ticker: 'AAPL', startDate: candles[0].time, endDate: candles[9].time,
      initialAmount: 1000, dcaAmount: 0, dcaInterval: 'monthly',
    });
    expect(res.totalCashInvested).toBe(1000);
  });

  it('timemachine missing benchmark falls back to 100', () => {
    const candles = mk(10, 100);
    const res = calculateTimeMachine(candles, [], {
      ticker: 'AAPL', startDate: candles[0].time, endDate: candles[9].time, initialAmount: 1000,
    });
    expect(res.finalBenchmarkValue).toBeGreaterThan(0);
  });

  it('timemachine maxDrawdown milestone >15% included, <15% excluded', () => {
    const volatile: Candle[] = [
      { time: '2020-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1e6 },
      { time: '2020-01-02', open: 200, high: 200, low: 200, close: 200, volume: 1e6 },
      { time: '2020-01-03', open: 100, high: 100, low: 100, close: 100, volume: 1e6 },
    ];
    const resVol = calculateTimeMachine(volatile, volatile, { ticker: 'AAPL', startDate: '2020-01-01', endDate: '2020-01-03', initialAmount: 1000 });
    expect(resVol.milestones.some(m => m.title.includes('Pullback'))).toBe(true);

    const flat = mk(5, 100, 0);
    const resFlat = calculateTimeMachine(flat, flat, { ticker: 'AAPL', startDate: flat[0].time, endDate: flat[4].time, initialAmount: 1000 });
    expect(resFlat.milestones.some(m => m.title.includes('Pullback'))).toBe(false);
  });

  it('timemachine hasDoubled only once', () => {
    const candles: Candle[] = [
      { time: '2020-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1e6 },
      { time: '2020-01-02', open: 200, high: 200, low: 200, close: 200, volume: 1e6 },
      { time: '2020-01-03', open: 300, high: 300, low: 300, close: 300, volume: 1e6 },
      { time: '2020-01-04', open: 400, high: 400, low: 400, close: 400, volume: 1e6 },
    ];
    const res = calculateTimeMachine(candles, candles, { ticker: 'AAPL', startDate: '2020-01-01', endDate: '2020-01-04', initialAmount: 1000 });
    expect(res.milestones.filter(m => m.title.includes('Doubled')).length).toBe(1);
  });

  it('timemachine years floor 0.1 handling', () => {
    const candles: Candle[] = [
      { time: '2020-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1e6 },
      { time: '2020-01-02', open: 110, high: 110, low: 110, close: 110, volume: 1e6 },
    ];
    const res = calculateTimeMachine(candles, candles, { ticker: 'AAPL', startDate: '2020-01-01', endDate: '2020-01-02', initialAmount: 1000 });
    expect(Number.isFinite(res.cagrPercent)).toBe(true);
  });

  it('tracking error annualized volatility scales with diff magnitude', () => {
    const a = Array.from({ length: 20 }, (_, i) => 100 + i);
    const bClose = a.map(v => v + 0.1);
    const bFar = a.map(v => v + 10);
    expect(calculateTrackingError(a, bFar).trackingErrorPercent).toBeGreaterThan(calculateTrackingError(a, bClose).trackingErrorPercent);
  });
});
