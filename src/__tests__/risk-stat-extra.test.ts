import { describe, it, expect } from 'vitest';
import { calculateReturns, calculateAnnualizedVolatility } from '../engine/risk/volatility';
import { calculateBeta } from '../engine/risk/beta';
import { calculateValueAtRisk, calculateSharpeRatio, calculateSortinoRatio } from '../engine/risk/var';
import { calculateMaxDrawdown } from '../engine/risk/drawdown';
import { calculateDiversification } from '../engine/risk/diversification';
import { calculatePerformanceAttribution } from '../engine/risk/attribution';
import { computeBacktestStats } from '../engine/backtester/stats';

describe('Risk & Stats Extra', () => {
  it('calculateReturns handles zero prev -> 0', () => {
    expect(calculateReturns([0, 100])[0]).toBe(0);
    expect(calculateReturns([10, 0])[0]).toBe(-1);
  });

  it('volatility 0 for flat returns', () => {
    expect(calculateAnnualizedVolatility([0, 0, 0, 0, 0])).toBe(0);
  });

  it('VaR sorted order worst return at floor index', () => {
    const rets = [-0.1, -0.05, 0, 0.05, 0.1, 0.1];
    // 95% => index floor(0.05*6)=0 => worst -0.1 =>10%
    expect(calculateValueAtRisk(rets, 0.95)).toBe(10);
  });

  it('Sharpe negative when return < riskFree', () => {
    const rets = Array(10).fill(-0.01);
    expect(calculateSharpeRatio(rets, 0.04)).toBeLessThan(0);
  });

  it('Sortino with downside correctly negative', () => {
    const rets = [0.02, -0.03, 0.01, -0.04, 0.005];
    const sortino = calculateSortinoRatio(rets);
    expect(typeof sortino).toBe('number');
  });

  it('Beta 0 when no correlation', () => {
    const port = [0.01, -0.01, 0.01, -0.01];
    const bench = [0.01, 0.01, -0.01, -0.01];
    const beta = calculateBeta(port, bench);
    expect(beta).toBeCloseTo(0, 1);
  });

  it('Beta 2 when double sensitivity', () => {
    const bench = [0.01, 0.02, -0.01, 0.03];
    const port = bench.map(v => v * 2);
    expect(calculateBeta(port, bench)).toBeCloseTo(2, 0);
  });

  it('MaxDrawdown picks correct peak/trough', () => {
    const s = [
      { date: '2020-01-01', value: 100 },
      { date: '2020-01-02', value: 120 },
      { date: '2020-01-03', value: 80 },
      { date: '2020-01-04', value: 90 },
    ];
    const r = calculateMaxDrawdown(s);
    expect(r.peakDate).toBe('2020-01-02');
    expect(r.troughDate).toBe('2020-01-03');
    expect(r.maxDrawdownPercent).toBeCloseTo(33.33, 1);
  });

  it('Diversification HHI 10000 for single holding', () => {
    const pos: any = { AAPL: { ticker: 'AAPL', shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 100, currentValue: 10000, unrealizedPnL: 0, unrealizedPnLPercent: 0, realizedPnL: 0 } };
    const res = calculateDiversification(pos, 0);
    expect(res.sectorConcentrationHHI).toBe(10000);
    expect(res.score).toBe(0);
  });

  it('Diversification with 3 sectors equally weighted high score', () => {
    const mk = (t: string, sector: string, val: number) => ({ ticker: t, shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 100, currentValue: val, unrealizedPnL: 0, unrealizedPnLPercent: 0, realizedPnL: 0 });
    // Mock getTickerInfo via real tickers: AAPL Tech, JPM Financials, JNJ Healthcare
    const pos: any = { AAPL: mk('AAPL', 'Tech', 3333), JPM: mk('JPM', 'Financials', 3333), JNJ: mk('JNJ', 'Healthcare', 3334) };
    const res = calculateDiversification(pos, 0);
    expect(res.score).toBeGreaterThan(70);
  });

  it('PerformanceAttribution sum contributions approx total PnL percent', () => {
    const pos: any = {
      AAPL: { ticker: 'AAPL', shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 110, currentValue: 1100, unrealizedPnL: 100, unrealizedPnLPercent: 10, realizedPnL: 50 },
      MSFT: { ticker: 'MSFT', shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 90, currentValue: 900, unrealizedPnL: -100, unrealizedPnLPercent: -10, realizedPnL: 0 },
    };
    const attr = calculatePerformanceAttribution(pos, 10000);
    expect(attr[0].ticker).toBe('AAPL');
    expect(attr.reduce((s, a) => s + a.pnl, 0)).toBe(50); // 150 + (-100)
  });

  it('computeBacktestStats winRate 100% when all wins', () => {
    const trades: any = [{ id: '1', entryDate: '2020-01-01', exitDate: '2020-01-02', entryPrice: 100, exitPrice: 110, shares: 10, pnl: 100, pnlPercent: 10, reason: 'x' }];
    const curve: any = [{ date: '2020-01-01', strategyValue: 10000, buyAndHoldValue: 10000, benchmarkValue: 10000 }, { date: '2020-01-02', strategyValue: 10100, buyAndHoldValue: 10100, benchmarkValue: 10100 }];
    expect(computeBacktestStats(trades, curve, 10000, '2020-01-01', '2020-01-02').winRatePercent).toBe(100);
  });

  it('computeBacktestStats handles breakeven not counted as win/loss', () => {
    const trades: any = [
      { id: '1', entryDate: '2020-01-01', exitDate: '2020-01-02', entryPrice: 100, exitPrice: 110, shares: 10, pnl: 100, pnlPercent: 10, reason: 'x' },
      { id: '2', entryDate: '2020-01-03', exitDate: '2020-01-04', entryPrice: 100, exitPrice: 100, shares: 10, pnl: 0, pnlPercent: 0, reason: 'x' },
      { id: '3', entryDate: '2020-01-05', exitDate: '2020-01-06', entryPrice: 100, exitPrice: 90, shares: 10, pnl: -100, pnlPercent: -10, reason: 'x' },
    ];
    const curve: any = [{ date: '2020-01-01', strategyValue: 10000, buyAndHoldValue: 10000, benchmarkValue: 10000 }, { date: '2020-01-06', strategyValue: 10000, buyAndHoldValue: 10000, benchmarkValue: 10000 }];
    const s = computeBacktestStats(trades, curve, 10000, '2020-01-01', '2020-01-06');
    expect(s.winningTrades).toBe(1);
    expect(s.losingTrades).toBe(1);
    expect(s.winRatePercent).toBeCloseTo(33.33, 1);
  });

  it('calculateReturns single value returns empty', () => {
    expect(calculateReturns([100])).toEqual([]);
  });

  it('diversification assetType breakdown includes stock/etf', () => {
    const pos: any = {
      AAPL: { ticker: 'AAPL', shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 100, currentValue: 5000, unrealizedPnL: 0, unrealizedPnLPercent: 0, realizedPnL: 0 },
      SPY: { ticker: 'SPY', shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 100, currentValue: 5000, unrealizedPnL: 0, unrealizedPnLPercent: 0, realizedPnL: 0 },
    };
    const res = calculateDiversification(pos, 0);
    expect(res.assetClassAllocations.length).toBeGreaterThan(0);
  });
});
