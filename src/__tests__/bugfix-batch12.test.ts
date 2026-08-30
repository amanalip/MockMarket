import { describe, it, expect } from 'vitest';
import { calculateVolumeMA } from '../engine/indicators/volume-ma';
import { computeBacktestStats, computeMonthlyReturns } from '../engine/backtester/stats';
import { runBacktest } from '../engine/backtester/backtester';
import { Candle, BacktestConfig } from '../model/types';

const mkCandles = (n: number, price = 100): Candle[] =>
  Array.from({ length: n }, (_, i) => ({
    time: `2024-01-${String(i + 1).padStart(2, '0')}`,
    open: price, high: price + 1, low: price - 1, close: price, volume: 1000,
  }));

describe('Bugfix Batch 12 – Volume/Stats/Backtester guards', () => {
  it('volume MA clamps negative volume to 0', () => {
    const candles: Candle[] = [
      { time: '2024-01-01', open: 10, high: 10, low: 10, close: 10, volume: -500 },
      { time: '2024-01-02', open: 10, high: 10, low: 10, close: 10, volume: 1000 },
      { time: '2024-01-03', open: 10, high: 10, low: 10, close: 10, volume: 1500 },
    ];
    const res = calculateVolumeMA(candles, 2);
    expect(res[0].value).toBe(500); // (-0 +1000)/2? Actually -500 clamped to 0 => (0+1000)/2=500
    expect(res.every(r => r.value >= 0)).toBe(true);
  });

  it('avgWin/avgLoss sanitizes Infinity', () => {
    const trades: any = [
      { id: '1', entryDate: '2024-01-01', exitDate: '2024-01-02', entryPrice: 100, exitPrice: 110, shares: 10, pnl: 100, pnlPercent: Infinity, reason: 'x' },
      { id: '2', entryDate: '2024-01-03', exitDate: '2024-01-04', entryPrice: 100, exitPrice: 90, shares: 10, pnl: -50, pnlPercent: -Infinity, reason: 'x' },
    ];
    const curve: any = [
      { date: '2024-01-01', strategyValue: 10000, buyAndHoldValue: 10000, benchmarkValue: 10000 },
      { date: '2024-01-04', strategyValue: 10050, buyAndHoldValue: 10050, benchmarkValue: 10050 },
    ];
    const s = computeBacktestStats(trades, curve, 10000, '2024-01-01', '2024-01-04');
    expect(Number.isFinite(s.avgWinPercent)).toBe(true);
    expect(Number.isFinite(s.avgLossPercent)).toBe(true);
    // Infinity should be filtered, so avgWin from empty? Actually winning has 1 with Infinity filtered => 0
    expect(s.avgWinPercent).toBe(0);
    expect(s.avgLossPercent).toBe(0);
  });

  it('monthly returns guards NaN and date overflow', () => {
    const curve: any = [
      { date: '2024-02-30', strategyValue: 100, buyAndHoldValue: 100, benchmarkValue: 100 },
      { date: '2024-03-01', strategyValue: NaN as any, buyAndHoldValue: 100, benchmarkValue: 100 },
      { date: '2024-03-15', strategyValue: 110, buyAndHoldValue: 110, benchmarkValue: 110 },
    ];
    const res = computeMonthlyReturns(curve);
    // overflow date and NaN value should be skipped, only March 15 valid
    expect(res.length).toBe(1);
    expect(res[0].month).toBe(3);
    expect(Number.isFinite(res[0].returnPercent)).toBe(true);
  });

  it('runBacktest validates initialCash and dates', () => {
    const candles = mkCandles(10, 100);
    const bench = mkCandles(10, 100);
    const base: BacktestConfig = {
      ticker: 'AAPL', startDate: '2024-01-01', endDate: '2024-01-10', initialCash: 10000,
      positionSizePercent: 100, entryRule: 'x', exitRule: 'y', stopLossPercent: 0, takeProfitPercent: 0,
    };
    expect(() => runBacktest(candles, bench, { ...base, initialCash: NaN as any }, () => false, () => false)).toThrow(/Invalid initialCash/);
    expect(() => runBacktest(candles, bench, { ...base, initialCash: Infinity as any }, () => false, () => false)).toThrow(/Invalid initialCash/);
    expect(() => runBacktest(candles, bench, { ...base, startDate: '2024-02-30' }, () => false, () => false)).toThrow(/Invalid date/);
    expect(() => runBacktest(candles, bench, { ...base, startDate: 'not-a-date' }, () => false, () => false)).toThrow(/Invalid date/);
    // valid still works
    expect(() => runBacktest(candles, bench, base, () => false, () => false)).not.toThrow();
  });

  it('filterCandlesByDate already tested but monthly sanity', () => {
    const curve: any = [
      { date: '2024-01-15', strategyValue: 100, buyAndHoldValue: 100, benchmarkValue: 100 },
      { date: '2024-02-15', strategyValue: 110, buyAndHoldValue: 110, benchmarkValue: 110 },
    ];
    const res = computeMonthlyReturns(curve);
    expect(res.length).toBe(2);
    expect(res[0].returnPercent).toBe(0); // first month start 100->100? Actually month start 100 end 100 =>0
    expect(res[1].returnPercent).toBe(10);
  });
});
