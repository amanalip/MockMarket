import { describe, it, expect } from 'vitest';
import { normalizeWeights, simulateETF } from '../engine/etf/etf-builder';
import { calculateTrackingError } from '../engine/etf/tracking-error';
import { Candle, CustomETFConfig } from '../model/types';

describe('Custom ETF Builder Engine', () => {
  const dates = [
    '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05',
    '2024-02-01', '2024-02-02', '2024-02-05', '2024-03-01'
  ];

  const aaplCandles: Candle[] = dates.map((time, i) => ({
    time,
    open: 100 + i * 2,
    high: 105 + i * 2,
    low: 98 + i * 2,
    close: 100 + i * 2,
    volume: 1000,
  }));

  const msftCandles: Candle[] = dates.map((time, i) => ({
    time,
    open: 200 + i * 1,
    high: 205 + i * 1,
    low: 198 + i * 1,
    close: 200 + i * 1,
    volume: 1000,
  }));

  const candleMap = {
    AAPL: aaplCandles,
    MSFT: msftCandles,
  };

  it('normalizes arbitrary weight inputs so they sum to 100%', () => {
    const input = [
      { ticker: 'AAPL', targetWeight: 30 },
      { ticker: 'MSFT', targetWeight: 30 },
    ];
    const normalized = normalizeWeights(input);
    const sum = normalized.reduce((acc, t) => acc + t.targetWeight, 0);
    expect(sum).toBeCloseTo(100, 1);
    expect(normalized[0].targetWeight).toBe(50);
    expect(normalized[1].targetWeight).toBe(50);
  });

  it('simulates ETF daily NAV and records weight drift', () => {
    const config: CustomETFConfig = {
      id: 'test_etf',
      name: 'Tech Duo',
      tickers: [
        { ticker: 'AAPL', targetWeight: 50 },
        { ticker: 'MSFT', targetWeight: 50 },
      ],
      rebalanceFrequency: 'monthly',
      createdAt: '2024-01-02',
    };

    const result = simulateETF(config, candleMap);
    expect(result.navHistory.length).toBe(dates.length);
    expect(result.navHistory[0].nav).toBe(100);
    expect(result.navHistory[result.navHistory.length - 1].nav).toBeGreaterThan(100);
    expect(result.driftHistory.length).toBe(dates.length);
    expect(result.metrics.totalReturnPercent).toBeGreaterThan(0);
    expect(typeof result.metrics.annualizedVolatility).toBe('number');
  });

  it('computes tracking error and correlation against a benchmark series', () => {
    const customNavs = [100, 102, 104, 103, 107, 106, 110];
    const benchNavs = [100, 101, 103, 102, 105, 104, 108];

    const result = calculateTrackingError(customNavs, benchNavs);
    expect(result.correlation).toBeGreaterThan(0.9);
    expect(result.trackingErrorPercent).toBeGreaterThanOrEqual(0);
  });
});
