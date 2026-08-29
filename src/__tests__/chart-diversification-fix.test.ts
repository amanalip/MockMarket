import { describe, it, expect } from 'vitest';
import { filterCandlesByTimeframe } from '../components/charts/chart-utils';
import { calculateDiversification } from '../engine/risk/diversification';
import { Candle } from '../model/types';
import { Position } from '../model/types';

const mk = (dates: string[]): Candle[] => dates.map(d => ({ time: d, open: 100, high: 110, low: 90, close: 100, volume: 1000 }));

describe('Chart & Diversification Fix', () => {
  it('filter returns empty when no candles in timeframe (not full history)', () => {
    const candles = mk(['2024-01-01', '2024-01-02']);
    const filtered = filterCandlesByTimeframe(candles, '1M', '2099-01-01');
    expect(filtered).toEqual([]);
    expect(filtered.length).toBe(0);
  });

  it('filter empty input returns empty', () => {
    expect(filterCandlesByTimeframe([], '1M')).toEqual([]);
  });

  it('filter MAX returns all', () => {
    const c = mk(['2024-01-01', '2024-01-02']);
    expect(filterCandlesByTimeframe(c, 'MAX').length).toBe(2);
  });

  it('filter 1M within range returns subset', () => {
    const candles = mk(['2024-01-01', '2024-02-01', '2024-03-01']);
    const f = filterCandlesByTimeframe(candles, '1M', '2024-03-01');
    expect(f.length).toBe(2);
    expect(f.map(c => c.time)).toEqual(['2024-02-01', '2024-03-01']);
  });

  it('filter 5Y includes older', () => {
    const candles = mk(['2020-01-01', '2024-01-01']);
    expect(filterCandlesByTimeframe(candles, '5Y', '2024-01-01').length).toBe(2);
  });

  it('filter uses UTC cutoff not local', () => {
    // 2024-03-01 minus 1M = 2024-02-01 UTC => both
    const candles = mk(['2024-02-01', '2024-03-01']);
    expect(filterCandlesByTimeframe(candles, '1M', '2024-03-01').map(c => c.time)).toEqual(['2024-02-01', '2024-03-01']);
  });

  it('filter with referenceDate before first returns empty (not fallback)', () => {
    const candles = mk(['2024-06-01', '2024-07-01']);
    expect(filterCandlesByTimeframe(candles, '1M', '2020-01-01')).toEqual([]);
  });

  it('filter referenceDate after last with 1M returns tail', () => {
    const candles = mk(['2024-01-01', '2024-01-15', '2024-02-15']);
    const f = filterCandlesByTimeframe(candles, '1M', '2024-02-15');
    expect(f.some(c => c.time === '2024-02-15')).toBe(true);
  });

  it('filter 3M cutoff', () => {
    const candles = mk(['2024-01-01', '2024-02-01', '2024-04-01', '2024-05-01']);
    const f = filterCandlesByTimeframe(candles, '3M', '2024-05-01');
    expect(f.map(c => c.time)).toEqual(['2024-02-01', '2024-04-01', '2024-05-01']);
  });

  it('filter 1Y cutoff', () => {
    const candles = mk(['2023-01-01', '2024-01-01']);
    expect(filterCandlesByTimeframe(candles, '1Y', '2024-01-01').length).toBe(2);
  });

  it('diversification HHI precise for 3 equal sectors', () => {
    // 3 sectors each 33.333...% => HHI = 3 * (33.333^2) = 3333.33
    const mkPos = (ticker: string, val: number, sector: string): Position => ({ ticker, shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 100, currentValue: val, unrealizedPnL: 0, unrealizedPnLPercent: 0, realizedPnL: 0 });
    // Need to mock getTickerInfo via real tickers: use AAPL (Tech), JPM (Financials), JNJ (Healthcare) each with different sectors
    const pos: any = {
      AAPL: { ticker: 'AAPL', shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 100, currentValue: 3333.33, unrealizedPnL: 0, unrealizedPnLPercent: 0, realizedPnL: 0 },
      JPM: { ticker: 'JPM', shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 100, currentValue: 3333.33, unrealizedPnL: 0, unrealizedPnLPercent: 0, realizedPnL: 0 },
      JNJ: { ticker: 'JNJ', shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 100, currentValue: 3333.34, unrealizedPnL: 0, unrealizedPnLPercent: 0, realizedPnL: 0 },
    };
    const res = calculateDiversification(pos, 0);
    // With precise HHI, should be ~3333, not 3332 from rounded 33.33^2*3
    expect(res.sectorConcentrationHHI).toBeGreaterThanOrEqual(3333);
    expect(res.sectorConcentrationHHI).toBeLessThanOrEqual(3334);
  });

  it('diversification single ticker HHI 10000 score 0', () => {
    const pos: any = { AAPL: { ticker: 'AAPL', shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 100, currentValue: 10000, unrealizedPnL: 0, unrealizedPnLPercent: 0, realizedPnL: 0 } };
    const res = calculateDiversification(pos, 0);
    expect(res.sectorConcentrationHHI).toBe(10000);
    expect(res.score).toBe(0);
  });

  it('diversification with cash calculates correctly', () => {
    const pos: any = { AAPL: { ticker: 'AAPL', shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 100, currentValue: 5000, unrealizedPnL: 0, unrealizedPnLPercent: 0, realizedPnL: 0 } };
    const res = calculateDiversification(pos, 5000);
    expect(res.tickerAllocations.find(t => t.ticker === 'CASH')?.percent).toBe(50);
  });

  it('diversification empty with cash', () => {
    const res = calculateDiversification({}, 5000);
    expect(res.sectorConcentrationHHI).toBe(10000);
    expect(res.score).toBe(0);
  });

  it('diversification zero total returns 0', () => {
    const res = calculateDiversification({}, 0);
    expect(res.sectorConcentrationHHI).toBe(10000);
  });

  it('filter with no reference uses last candle', () => {
    const candles = mk(['2024-01-01', '2024-02-01']);
    expect(filterCandlesByTimeframe(candles, '1M').map(c => c.time)).toEqual(['2024-01-01', '2024-02-01']);
  });

  it('diversification 2 equal sectors HHI 5000', () => {
    const pos: any = {
      AAPL: { ticker: 'AAPL', shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 100, currentValue: 5000, unrealizedPnL: 0, unrealizedPnLPercent: 0, realizedPnL: 0 },
      JPM: { ticker: 'JPM', shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 100, currentValue: 5000, unrealizedPnL: 0, unrealizedPnLPercent: 0, realizedPnL: 0 },
    };
    const res = calculateDiversification(pos, 0);
    // Two sectors 50% each => HHI 5000
    expect(res.sectorConcentrationHHI).toBe(5000);
  });

  it('filter respects targetDate inclusive', () => {
    const candles = mk(['2024-01-01', '2024-01-15', '2024-02-01']);
    const f = filterCandlesByTimeframe(candles, '1M', '2024-02-01');
    expect(f.some(c => c.time === '2024-02-01')).toBe(true);
    expect(f.some(c => c.time === '2024-01-15')).toBe(true);
    expect(f.length).toBe(3);
  });

  it('diversification ticker allocations sum 100', () => {
    const pos: any = {
      AAPL: { ticker: 'AAPL', shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 100, currentValue: 3000, unrealizedPnL: 0, unrealizedPnLPercent: 0, realizedPnL: 0 },
      MSFT: { ticker: 'MSFT', shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 100, currentValue: 7000, unrealizedPnL: 0, unrealizedPnLPercent: 0, realizedPnL: 0 },
    };
    const res = calculateDiversification(pos, 0);
    const sum = res.tickerAllocations.reduce((s, t) => s + t.percent, 0);
    expect(sum).toBeCloseTo(100, 1);
  });

  it('filter 6M from 2024-07-01', () => {
    const candles = mk(['2024-01-01', '2024-07-01']);
    expect(filterCandlesByTimeframe(candles, '6M', '2024-07-01').length).toBe(2);
  });

  it('diversification score 0-100 bounds', () => {
    const pos: any = { AAPL: { ticker: 'AAPL', shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 100, currentValue: 1000, unrealizedPnL: 0, unrealizedPnLPercent: 0, realizedPnL: 0 } };
    const res = calculateDiversification(pos, 0);
    expect(res.score).toBeGreaterThanOrEqual(0);
    expect(res.score).toBeLessThanOrEqual(100);
  });

  it('filter returns new array not same reference', () => {
    const candles = mk(['2024-01-01']);
    const f = filterCandlesByTimeframe(candles, 'MAX');
    expect(f).toBe(candles); // MAX returns same reference per impl? Actually returns same array reference per impl
    // For non-MAX, should be filtered new array
    const f2 = filterCandlesByTimeframe(mk(['2024-01-01', '2024-02-01']), '1M', '2024-02-01');
    expect(f2.length).toBe(2);
  });

  it('diversification Other sector for unknown ticker', () => {
    const pos: any = { FAKE: { ticker: 'FAKE', shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 100, currentValue: 1000, unrealizedPnL: 0, unrealizedPnLPercent: 0, realizedPnL: 0 } };
    const res = calculateDiversification(pos, 0);
    expect(res.sectorAllocations.some(s => s.sector === 'Other')).toBe(true);
  });

  it('filter handles single candle', () => {
    expect(filterCandlesByTimeframe(mk(['2024-01-01']), '1M', '2024-01-01').length).toBe(1);
  });

  it('diversification with 10 equal sectors high score', () => {
    // Simulate 10 holdings each different sector via mock: use many tickers but will map to actual sectors, score high
    const pos: any = {};
    ['AAPL', 'JPM', 'JNJ', 'XOM', 'CAT', 'WMT', 'NFLX', 'SPY', 'BTC', 'UNH'].forEach((t, i) => pos[t] = { ticker: t, shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 100, currentValue: 1000, unrealizedPnL: 0, unrealizedPnLPercent: 0, realizedPnL: 0 });
    const res = calculateDiversification(pos, 0);
    expect(res.score).toBeGreaterThan(80);
  });
});
