import { describe, it, expect } from 'vitest';
import { runBacktest } from '../engine/backtester/backtester';
import { Candle, BacktestConfig } from '../model/types';

describe('Backtester Engine', () => {
  // Synthesize 100 days of oscillating trend data
  const sampleCandles: Candle[] = Array.from({ length: 100 }, (_, i) => {
    const month = i < 30 ? '01' : (i < 60 ? '02' : (i < 90 ? '03' : '04'));
    const d = String((i % 28) + 1).padStart(2, '0');
    const close = 100 + Math.sin(i / 5) * 20 + i * 0.8;
    return {
      time: `2024-${month}-${d}`,
      open: close - 1,
      high: close + 3,
      low: close - 3,
      close: Number(close.toFixed(2)),
      volume: 1000000,
    };
  });

  const benchmarkCandles: Candle[] = sampleCandles.map((c, i) => ({
    ...c,
    close: Number((100 + i * 0.5).toFixed(2)),
  }));

  const baseConfig: BacktestConfig = {
    ticker: 'TEST',
    startDate: sampleCandles[0].time,
    endDate: sampleCandles[sampleCandles.length - 1].time,
    initialCash: 100000,
    positionSizePercent: 100,
    entryRule: 'RSI < 30',
    exitRule: 'RSI > 70',
    stopLossPercent: 10,
    takeProfitPercent: 20,
  };

  it('runs backtest simulation with rule evaluations and computes equity curve', () => {
    // Simple custom strategy: Enter on even bars, exit on odd bars
    const result = runBacktest(
      sampleCandles,
      benchmarkCandles,
      baseConfig,
      (ctx) => ctx.index % 10 === 0, // Enter every 10 bars
      (ctx) => (ctx.holdingDays || 0) >= 5 // Exit after 5 days
    );

    expect(result.trades.length).toBeGreaterThan(0);
    expect(result.equityCurve.length).toBe(sampleCandles.length);
    expect(result.stats.totalTrades).toBe(result.trades.length);
    expect(typeof result.stats.totalReturnPercent).toBe('number');
    expect(typeof result.stats.cagrPercent).toBe('number');
    expect(typeof result.stats.sharpeRatio).toBe('number');
    expect(result.monthlyReturns.length).toBeGreaterThan(0);
  });

  it('triggers stop loss exits when price falls below defined threshold', () => {
    // Force enter at bar 0
    const result = runBacktest(
      sampleCandles,
      benchmarkCandles,
      { ...baseConfig, stopLossPercent: 2, takeProfitPercent: 0 },
      (ctx) => ctx.index === 0,
      () => false // Never rule exit
    );

    expect(result.trades.length).toBeGreaterThan(0);
    const stoppedTrades = result.trades.filter((t) => t.reason === 'Stop Loss');
    expect(stoppedTrades.length).toBeGreaterThan(0);
  });

  it('triggers take profit exits when price spikes above target threshold', () => {
    // Force enter at bar 0
    const result = runBacktest(
      sampleCandles,
      benchmarkCandles,
      { ...baseConfig, stopLossPercent: 0, takeProfitPercent: 5 },
      (ctx) => ctx.index === 0,
      () => false // Never rule exit
    );

    expect(result.trades.length).toBeGreaterThan(0);
    const profitTrades = result.trades.filter((t) => t.reason === 'Take Profit');
    expect(profitTrades.length).toBeGreaterThan(0);
  });
});
