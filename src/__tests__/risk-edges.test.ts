import { describe, it, expect } from 'vitest';
import { calculateReturns, calculateAnnualizedVolatility } from '../engine/risk/volatility';
import { calculateMaxDrawdown } from '../engine/risk/drawdown';
import { calculateValueAtRisk, calculateSharpeRatio, calculateSortinoRatio } from '../engine/risk/var';
import { calculateBeta } from '../engine/risk/beta';
import { calculateDiversification } from '../engine/risk/diversification';
import { calculatePerformanceAttribution } from '../engine/risk/attribution';

describe('Risk Analytics - Edges', () => {
  it('calculateReturns handles prev <=0 returns 0', () => {
    expect(calculateReturns([0,100])).toEqual([0]);
    expect(calculateReturns([ -5,10])).toEqual([0]);
    expect(calculateReturns([100,110])).toEqual([0.1]);
    expect(calculateReturns([100])).toEqual([]);
  });

  it('volatility 0 for <2 returns', () => {
    expect(calculateAnnualizedVolatility([])).toBe(0);
    expect(calculateAnnualizedVolatility([0.01])).toBe(0);
  });

  it('volatility positive for varying returns', () => {
    const r=[0.01, -0.02, 0.015, -0.005, 0.02];
    expect(calculateAnnualizedVolatility(r)).toBeGreaterThan(0);
  });

  it('maxDrawdown empty returns 0', () => {
    const res=calculateMaxDrawdown([]);
    expect(res.maxDrawdownPercent).toBe(0);
    expect(res.peakDate).toBe('');
  });

  it('maxDrawdown flat series 0', () => {
    const s=[{date:'2024-01-01',value:100},{date:'2024-01-02',value:100},{date:'2024-01-03',value:100}];
    expect(calculateMaxDrawdown(s).maxDrawdownPercent).toBe(0);
  });

  it('maxDrawdown decreasing 50%', () => {
    const s=[{date:'2024-01-01',value:100},{date:'2024-01-02',value:50}];
    expect(calculateMaxDrawdown(s).maxDrawdownPercent).toBe(50);
    expect(calculateMaxDrawdown(s).peakDate).toBe('2024-01-01');
    expect(calculateMaxDrawdown(s).troughDate).toBe('2024-01-02');
  });

  it('maxDrawdown recovers correctly picks max', () => {
    const s=[{date:'2024-01-01',value:100},{date:'2024-01-02',value:80},{date:'2024-01-03',value:120},{date:'2024-01-04',value:90}];
    // peak 100->80 =20%, peak 120->90=25% max 25%
    expect(calculateMaxDrawdown(s).maxDrawdownPercent).toBe(25);
  });

  it('VaR <5 returns 0', () => {
    expect(calculateValueAtRisk([0.01,0.02])).toBe(0);
  });

  it('VaR 95% returns positive percent', () => {
    const rets=[-0.05,-0.02,-0.01,0,0.01,0.02,0.03];
    expect(calculateValueAtRisk(rets,0.95)).toBeGreaterThan(0);
  });

  it('Sharpe <5 returns 0', () => {
    expect(calculateSharpeRatio([0.01,0.02])).toBe(0);
  });

  it('Sharpe zero vol returns 0', () => {
    expect(calculateSharpeRatio([0,0,0,0,0])).toBe(0);
  });

  it('Sortino all positive uses magic 10x fallback', () => {
    const rets=[0.01,0.02,0.015,0.01,0.02];
    const sortino=calculateSortinoRatio(rets);
    // downside 0 => returns annual*10
    expect(sortino).toBeGreaterThan(0);
  });

  it('Sortino <5 returns 0', () => {
    expect(calculateSortinoRatio([0.01])).toBe(0);
  });

  it('Beta returns 1 for insufficient data', () => {
    expect(calculateBeta([0.01],[0.02])).toBe(1);
    expect(calculateBeta([],[ ])).toBe(1);
  });

  it('Beta flat benchmark returns 1', () => {
    const port=[0.01,0.02,0.015];
    const bench=[0.01,0.01,0.01];
    expect(calculateBeta(port,bench)).toBe(1);
  });

  it('Beta perfect correlation ~1', () => {
    const port=[0.01,0.02,0.03,0.04,0.05];
    const bench=[0.01,0.02,0.03,0.04,0.05];
    expect(calculateBeta(port,bench)).toBeCloseTo(1,1);
  });

  it('diversification single ticker low score', () => {
    const positions={ AAPL:{ ticker:'AAPL', shares:10, avgCost:100, totalCost:1000, currentPrice:100, currentValue:10000, unrealizedPnL:0, unrealizedPnLPercent:0, realizedPnL:0 } } as any;
    const res=calculateDiversification(positions,0);
    expect(res.score).toBeLessThan(20);
  });

  it('diversification diversified high score', () => {
    const mkPos=(ticker:string)=>({ ticker, shares:10, avgCost:100, totalCost:1000, currentPrice:100, currentValue:2000, unrealizedPnL:0, unrealizedPnLPercent:0, realizedPnL:0 });
    const positions={ AAPL:mkPos('AAPL'), MSFT:mkPos('MSFT'), GOOGL:mkPos('GOOGL'), AMZN:mkPos('AMZN'), TSLA:mkPos('TSLA') } as any;
    const res=calculateDiversification(positions,0);
    expect(res.score).toBeGreaterThan(50);
  });

  it('attribution handles zero startingCash', () => {
    const p={ AAPL:{ ticker:'AAPL', shares:10, avgCost:100, totalCost:1000, currentPrice:120, currentValue:1200, unrealizedPnL:200, unrealizedPnLPercent:20, realizedPnL:0 } } as any;
    const res=calculatePerformanceAttribution(p,0);
    expect(res.length).toBe(0);
  });

  it('attribution sorted descending by contribution', () => {
    const p={
      AAPL:{ ticker:'AAPL', shares:10, avgCost:100, totalCost:1000, currentPrice:200, currentValue:2000, unrealizedPnL:1000, unrealizedPnLPercent:100, realizedPnL:0 },
      MSFT:{ ticker:'MSFT', shares:10, avgCost:100, totalCost:1000, currentPrice:110, currentValue:1100, unrealizedPnL:100, unrealizedPnLPercent:10, realizedPnL:0 },
    } as any;
    const res=calculatePerformanceAttribution(p,10000);
    expect(res[0].ticker).toBe('AAPL');
  });
});
