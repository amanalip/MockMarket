import { describe, it, expect } from 'vitest';
import { calculateTimeMachine } from '../engine/timemachine/timemachine';
import { Candle } from '../model/types';

describe('Time Machine Investment Simulator', () => {
  const dates = [
    '2024-01-02', '2024-01-15', '2024-02-01', '2024-02-15',
    '2024-03-01', '2024-03-15', '2024-04-01', '2024-04-15'
  ];

  // Asset doubles from 100 to 200
  const assetCandles: Candle[] = dates.map((time, i) => ({
    time,
    open: 100 + i * 15,
    high: 105 + i * 15,
    low: 95 + i * 15,
    close: 100 + i * 15,
    volume: 1000,
  }));

  const benchCandles: Candle[] = dates.map((time, i) => ({
    time,
    open: 100 + i * 5,
    high: 105 + i * 5,
    low: 95 + i * 5,
    close: 100 + i * 5,
    volume: 1000,
  }));

  it('calculates lumpsum growth and CAGR accurately', () => {
    const res = calculateTimeMachine(assetCandles, benchCandles, {
      ticker: 'TEST',
      startDate: '2024-01-02',
      endDate: '2024-04-15',
      initialAmount: 10000,
    });

    expect(res.totalCashInvested).toBe(10000);
    expect(res.finalAssetValue).toBeGreaterThan(18000);
    expect(res.totalReturnPercent).toBeGreaterThan(80);
    expect(res.growthCurve.length).toBe(dates.length);
    expect(res.milestones.some((m) => m.title.includes('Doubled'))).toBe(true);
  });

  it('simulates dollar cost averaging (DCA) contributions over time', () => {
    const res = calculateTimeMachine(assetCandles, benchCandles, {
      ticker: 'TEST',
      startDate: '2024-01-02',
      endDate: '2024-04-15',
      initialAmount: 1000,
      dcaAmount: 500,
      dcaInterval: 'monthly',
    });

    // 1000 initial + monthly adds across Feb, Mar, Apr
    expect(res.totalCashInvested).toBeGreaterThan(1000);
    expect(res.growthCurve[res.growthCurve.length - 1].investedCash).toBe(res.totalCashInvested);
  });

  it('forward-fills valid benchmark observations between asset dates', () => {
    const sparseAsset = assetCandles.slice(0, 3).map((c, index) => ({
      ...c,
      time: ['2024-01-02', '2024-01-05', '2024-01-08'][index],
    }));
    const sparseBenchmark: Candle[] = [
      { ...benchCandles[0], time: '2024-01-01', close: 100 },
      { ...benchCandles[0], time: '2024-01-03', close: 120 },
      { ...benchCandles[0], time: '2024-01-06', close: Number.POSITIVE_INFINITY },
    ];
    const res = calculateTimeMachine(sparseAsset, sparseBenchmark, {
      ticker: 'TEST',
      startDate: '2024-01-02',
      endDate: '2024-01-08',
      initialAmount: 10000,
    });

    expect(res.growthCurve.map((point) => point.benchmarkValue)).toEqual([10000, 12000, 12000]);
  });

  it('keeps the benchmark fallback for pre-history and empty data', () => {
    const config = {
      ticker: 'TEST',
      startDate: '2024-01-02',
      endDate: '2024-02-01',
      initialAmount: 10000,
    };
    const futureBenchmark = [{ ...benchCandles[0], time: '2024-01-20', close: 125 }];

    expect(calculateTimeMachine(assetCandles, futureBenchmark, config).growthCurve[0].benchmarkValue).toBe(10000);
    expect(calculateTimeMachine(assetCandles, [], config).growthCurve[0].benchmarkValue).toBe(10000);
  });
});
