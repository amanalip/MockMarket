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

  describe('execution realism', () => {
    const executionCandles: Candle[] = [
      { time: '2024-01-01', open: 100, high: 101, low: 99, close: 100, volume: 1000 },
      { time: '2024-01-02', open: 120, high: 122, low: 118, close: 121, volume: 1000 },
      { time: '2024-01-03', open: 130, high: 132, low: 128, close: 131, volume: 1000 },
      { time: '2024-01-04', open: 130, high: 132, low: 128, close: 131, volume: 1000 },
      { time: '2024-01-05', open: 130, high: 132, low: 128, close: 131, volume: 1000 },
      { time: '2024-01-06', open: 130, high: 132, low: 128, close: 131, volume: 1000 },
    ];
    const executionConfig: BacktestConfig = {
      ...baseConfig,
      startDate: '2024-01-01',
      endDate: '2024-01-06',
      initialCash: 10000,
      stopLossPercent: 0,
      takeProfitPercent: 0,
    };

    it('executes completed-bar entry and exit signals at later candle opens', () => {
      const result = runBacktest(
        executionCandles,
        executionCandles,
        executionConfig,
        ({ index }) => index === 0,
        ({ index }) => index === 1
      );

      expect(result.trades[0]).toMatchObject({
        entryDate: '2024-01-02',
        entryPrice: 120,
        exitDate: '2024-01-03',
        exitPrice: 130,
        reason: 'Signal Exit',
      });
    });

    it('waits through an invalid open for the next eligible candle', () => {
      const candles = executionCandles.map((c) => ({ ...c }));
      candles[1].open = Number.NaN;
      const result = runBacktest(
        candles,
        candles,
        executionConfig,
        ({ index }) => index === 0,
        ({ index }) => index === 2
      );

      expect(result.trades[0]).toMatchObject({
        entryDate: '2024-01-03',
        entryPrice: 130,
        exitDate: '2024-01-04',
      });
    });

    it('leaves a final-bar signal unfilled', () => {
      const finalEntryResult = runBacktest(
        executionCandles,
        executionCandles,
        executionConfig,
        ({ index }) => index === executionCandles.length - 1,
        () => false
      );
      const finalExitResult = runBacktest(
        executionCandles,
        executionCandles,
        executionConfig,
        ({ index }) => index === 0,
        ({ index }) => index === executionCandles.length - 1
      );

      expect(finalEntryResult.trades).toHaveLength(0);
      expect(finalEntryResult.equityCurve.at(-1)?.strategyValue).toBe(10000);
      expect(finalExitResult.trades).toHaveLength(0);
    });

    it('fills a stop gap at the worse opening price', () => {
      const candles = executionCandles.map((c) => ({ ...c }));
      candles[1] = { ...candles[1], open: 100, high: 101, low: 99, close: 100 };
      candles[2] = { ...candles[2], open: 80, high: 85, low: 75, close: 82 };
      const result = runBacktest(
        candles,
        candles,
        { ...executionConfig, stopLossPercent: 10 },
        ({ index }) => index === 0,
        () => false
      );

      expect(result.trades[0]).toMatchObject({ reason: 'Stop Loss', exitPrice: 80 });
    });

    it('fills a target gap at the favorable opening price', () => {
      const candles = executionCandles.map((c) => ({ ...c }));
      candles[1] = { ...candles[1], open: 100, high: 101, low: 99, close: 100 };
      candles[2] = { ...candles[2], open: 120, high: 125, low: 118, close: 122 };
      const result = runBacktest(
        candles,
        candles,
        { ...executionConfig, takeProfitPercent: 10 },
        ({ index }) => index === 0,
        () => false
      );

      expect(result.trades[0]).toMatchObject({ reason: 'Take Profit', exitPrice: 120 });
    });

    it('retains stop-before-target priority when both trade intrabar', () => {
      const candles = executionCandles.map((c) => ({ ...c }));
      candles[1] = { ...candles[1], open: 100, high: 101, low: 99, close: 100 };
      candles[2] = { ...candles[2], open: 100, high: 120, low: 80, close: 100 };
      const result = runBacktest(
        candles,
        candles,
        { ...executionConfig, stopLossPercent: 10, takeProfitPercent: 10 },
        ({ index }) => index === 0,
        () => false
      );

      expect(result.trades[0]).toMatchObject({ reason: 'Stop Loss', exitPrice: 90 });
    });

    it('forward-fills the latest valid benchmark observation between asset dates', () => {
      const asset = executionCandles.map((c, index) => ({
        ...c,
        time: `2024-01-${String(index * 2 + 2).padStart(2, '0')}`,
      }));
      const benchmark = [
        { ...asset[0], time: '2024-01-01', close: 100 },
        { ...asset[0], time: '2024-01-03', close: 120 },
        { ...asset[0], time: '2024-01-04', close: Number.NaN },
      ];
      const result = runBacktest(
        asset,
        benchmark,
        { ...executionConfig, startDate: asset[0].time, endDate: asset.at(-1)!.time },
        () => false,
        () => false
      );

      expect(result.equityCurve[0].benchmarkValue).toBe(10000);
      expect(result.equityCurve[1].benchmarkValue).toBe(12000);
      expect(result.equityCurve.at(-1)?.benchmarkValue).toBe(12000);
    });
  });
});
