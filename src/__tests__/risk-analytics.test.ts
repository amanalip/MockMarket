import { describe, it, expect } from 'vitest';
import {
  calculateReturns,
  calculateAnnualizedVolatility,
  calculateBeta,
  calculateMaxDrawdown,
  calculateValueAtRisk,
  calculateDiversification,
  calculatePerformanceAttribution,
} from '../engine/risk';
import { Position } from '../model/types';

describe('Portfolio Risk & Analytics Calculations', () => {
  it('calculates daily returns and annualized volatility accurately', () => {
    const values = [100, 102, 101, 103, 105, 104, 106];
    const returns = calculateReturns(values);
    expect(returns.length).toBe(6);
    expect(returns[0]).toBeCloseTo(0.02, 3);

    const vol = calculateAnnualizedVolatility(returns);
    expect(vol).toBeGreaterThan(0);
    expect(typeof vol).toBe('number');
  });

  it('calculates beta against a benchmark series', () => {
    const portReturns = [0.02, -0.01, 0.03, -0.02, 0.015];
    const benchReturns = [0.01, -0.005, 0.015, -0.01, 0.008];

    // Portfolio moves ~2x the benchmark
    const beta = calculateBeta(portReturns, benchReturns);
    expect(beta).toBeCloseTo(2.0, 1);
  });

  it('calculates max drawdown and detects peak / trough dates', () => {
    const series = [
      { date: '2024-01-01', value: 100 },
      { date: '2024-01-02', value: 120 }, // Peak
      { date: '2024-01-03', value: 90 },  // Trough (drawdown = (120-90)/120 = 25%)
      { date: '2024-01-04', value: 110 },
      { date: '2024-01-05', value: 130 },
    ];

    const result = calculateMaxDrawdown(series);
    expect(result.maxDrawdownPercent).toBe(25);
    expect(result.peakDate).toBe('2024-01-02');
    expect(result.troughDate).toBe('2024-01-03');
  });

  it('computes 95% Value at Risk from historical return quantiles', () => {
    const returns = [-0.05, -0.03, -0.02, -0.01, 0, 0.01, 0.02, 0.03, 0.04, 0.05];
    const var95 = calculateValueAtRisk(returns, 0.95);
    expect(var95).toBe(5); // Worst return is -5%, VaR expressed as positive %
  });

  it('evaluates portfolio diversification score and sector concentration', () => {
    const positions: Record<string, Position> = {
      AAPL: {
        ticker: 'AAPL',
        shares: 10,
        avgCost: 150,
        totalCost: 1500,
        currentPrice: 150,
        currentValue: 1500,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        realizedPnL: 0,
      },
      JPM: {
        ticker: 'JPM',
        shares: 10,
        avgCost: 150,
        totalCost: 1500,
        currentPrice: 150,
        currentValue: 1500,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0,
        realizedPnL: 0,
      },
    };

    const metrics = calculateDiversification(positions, 7000);
    expect(metrics.score).toBeGreaterThan(0);
    expect(metrics.sectorAllocations.length).toBeGreaterThan(0);
    expect(metrics.tickerAllocations.length).toBe(3); // AAPL, JPM, CASH
  });

  it('computes performance attribution per position', () => {
    const positions: Record<string, Position> = {
      AAPL: {
        ticker: 'AAPL',
        shares: 10,
        avgCost: 100,
        totalCost: 1000,
        currentPrice: 150,
        currentValue: 1500,
        unrealizedPnL: 500,
        unrealizedPnLPercent: 50,
        realizedPnL: 0,
      },
    };

    const attribution = calculatePerformanceAttribution(positions, 10000);
    expect(attribution.length).toBe(1);
    expect(attribution[0].ticker).toBe('AAPL');
    expect(attribution[0].pnl).toBe(500);
    expect(attribution[0].contributionPercent).toBe(5); // 500 / 10000 = 5%
  });
});
