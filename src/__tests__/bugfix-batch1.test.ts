import { describe, it, expect } from 'vitest';
import { runBacktest } from '../engine/backtester/backtester';
import { computeBacktestStats } from '../engine/backtester/stats';
import { Candle, BacktestConfig } from '../model/types';

const mkCandles = (n: number, startPrice = 100): Candle[] =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date('2020-01-01');
    d.setDate(d.getDate() + i);
    const price = startPrice + i;
    return { time: d.toISOString().split('T')[0], open: price, high: price + 2, low: price - 2, close: price, volume: 1_000_000 };
  });

const baseConfig: BacktestConfig = {
  ticker: 'AAPL',
  startDate: '2020-01-03',
  endDate: '2020-02-15',
  initialCash: 10000,
  positionSizePercent: 100,
  entryRule: 'SMA(50) > SMA(200)',
  exitRule: 'SMA(50) < SMA(200)',
  stopLossPercent: 0,
  takeProfitPercent: 0,
};

describe('Bugfix Batch 1 – Stats & Backtester edge hardening', () => {
  it('profitFactor capped to 999 not Infinity for JSON safety', () => {
    const trades: any = [{ id: '1', entryDate: '2020-01-01', exitDate: '2020-01-02', entryPrice: 100, exitPrice: 120, shares: 10, pnl: 200, pnlPercent: 20, reason: 'x' }];
    const curve: any = [
      { date: '2020-01-01', strategyValue: 10000, buyAndHoldValue: 10000, benchmarkValue: 10000 },
      { date: '2020-01-02', strategyValue: 10200, buyAndHoldValue: 10200, benchmarkValue: 10200 },
    ];
    const s = computeBacktestStats(trades, curve, 10000, '2020-01-01', '2020-01-02');
    expect(s.profitFactor).toBe(999);
    expect(Number.isFinite(s.profitFactor)).toBe(true);
    // JSON should preserve value (Infinity becomes null)
    const json = JSON.stringify({ pf: s.profitFactor });
    expect(JSON.parse(json).pf).toBe(999);
    expect(json).not.toContain('null');
  });

  it('cagrPercent finite when dates are invalid', () => {
    const trades: any = [{ id: '1', entryDate: '2020-01-01', exitDate: '2020-01-02', entryPrice: 100, exitPrice: 110, shares: 10, pnl: 100, pnlPercent: 10, reason: 'x' }];
    const curve: any = [
      { date: '2020-01-01', strategyValue: 10000, buyAndHoldValue: 10000, benchmarkValue: 10000 },
      { date: '2020-01-02', strategyValue: 11000, buyAndHoldValue: 11000, benchmarkValue: 11000 },
    ];
    const s = computeBacktestStats(trades, curve, 10000, 'not-a-date', 'also-bad');
    expect(Number.isFinite(s.cagrPercent)).toBe(true);
    expect(Number.isNaN(s.cagrPercent)).toBe(false);
  });

  it('avgHoldingDays finite when trade dates are corrupt', () => {
    const trades: any = [
      { id: '1', entryDate: '2020-01-01', exitDate: 'bad-date', entryPrice: 100, exitPrice: 110, shares: 10, pnl: 100, pnlPercent: 10, reason: 'x' },
      { id: '2', entryDate: 'also-bad', exitDate: '', entryPrice: 100, exitPrice: 90, shares: 10, pnl: -100, pnlPercent: -10, reason: 'x' },
    ];
    const curve: any = [
      { date: '2020-01-01', strategyValue: 10000, buyAndHoldValue: 10000, benchmarkValue: 10000 },
      { date: '2020-01-02', strategyValue: 10000, buyAndHoldValue: 10000, benchmarkValue: 10000 },
    ];
    const s = computeBacktestStats(trades, curve, 10000, '2020-01-01', '2020-01-02');
    expect(Number.isFinite(s.avgHoldingDays)).toBe(true);
    expect(Number.isNaN(s.avgHoldingDays)).toBe(false);
  });

  it('benchmark fallback not magic 100 when benchmark missing start date', () => {
    const candles = mkCandles(10, 100);
    // benchmark with first close 4000 and missing first candle date
    const bench: Candle[] = mkCandles(10, 4000);
    bench.shift(); // remove first date, so bench missing 2020-01-01
    // run with candles 2020-01-01..10, bench missing 2020-01-01
    const cfg: BacktestConfig = { ...baseConfig, startDate: '2020-01-01', endDate: '2020-01-10' };
    const res = runBacktest(candles, bench, cfg, () => false, () => false);
    // initialBenchPrice should be bench[0].close = 4001? (since bench start 4000+1) not 100
    // benchmarkValue at first point should be initialCash (since benchClose == initialBenchPrice)
    expect(res.equityCurve[0].benchmarkValue).not.toBe(10000 / 100 * bench[0].close); // would be huge if 100
    expect(res.equityCurve[0].benchmarkValue).toBe(10000);
    // also ensure no 100 fallback when bench empty but candle close finite
    const resEmpty = runBacktest(candles, [], cfg, () => false, () => false);
    expect(resEmpty.equityCurve[0].benchmarkValue).toBe(10000);
  });

  it('indicator NaN fallback uses finite close not NaN', () => {
    const candles = mkCandles(30, 100);
    // corrupt one early candle to poison SMA sum -> later SMA becomes NaN, but fallback should be close
    candles[5].close = NaN as any;
    candles[5].volume = NaN as any;
    const cfg: BacktestConfig = { ...baseConfig, startDate: '2020-01-01', endDate: '2020-01-30' };
    // entryFn that checks PRICE > SMA(20) – if indicator NaN then would be false incorrectly
    // With fix, SMA fallback is finite (candle close), so at index 25 price 125 vs sma fallback finite -> may be true
    const res = runBacktest(candles, candles, cfg, () => true, () => false);
    // equityCurve should remain finite, not NaN
    res.equityCurve.forEach(pt => {
      expect(Number.isFinite(pt.strategyValue)).toBe(true);
      expect(Number.isFinite(pt.buyAndHoldValue)).toBe(true);
      expect(Number.isFinite(pt.benchmarkValue)).toBe(true);
    });
    // at least trades array exists, and stats not poisoned
    expect(res.stats).toBeDefined();
    expect(Number.isFinite(res.stats.totalReturnPercent)).toBe(true);
  });
});
