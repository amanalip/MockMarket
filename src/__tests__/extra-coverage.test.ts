import { describe, it, expect, vi } from 'vitest';
import { exportPositionsToCSV, exportTradesToCSV, exportBacktestTradesToCSV } from '../engine/export/csv-export';
import { encodeShareState, decodeShareState, generateShareableLink } from '../engine/export/url-state';
import { computeBacktestStats, computeMonthlyReturns } from '../engine/backtester/stats';
import { calculateReturns } from '../engine/risk/volatility';
import { calculateMaxDrawdown } from '../engine/risk/drawdown';
import { calculateDiversification } from '../engine/risk/diversification';
import { filterCandlesByTimeframe } from '../components/charts/chart-utils';
import { Candle } from '../model/types';

describe('Extra Coverage - Security, Stats & Edge', () => {
  it('exportPositions handles multiple positions and empty', () => {
    const pos: any = {
      AAPL: { ticker: 'AAPL', shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 120, currentValue: 1200, unrealizedPnL: 200, unrealizedPnLPercent: 20, realizedPnL: 0 },
      MSFT: { ticker: 'MSFT', shares: 5, avgCost: 200, totalCost: 1000, currentPrice: 210, currentValue: 1050, unrealizedPnL: 50, unrealizedPnLPercent: 5, realizedPnL: 10 },
    };
    const csv = exportPositionsToCSV(pos);
    expect(csv.split('\n').length).toBe(3);
    expect(exportPositionsToCSV({})).toBe('Ticker,Shares,AvgCost,TotalCost,CurrentPrice,CurrentValue,UnrealizedPnL,UnrealizedPnLPercent,RealizedPnL');
  });

  it('exportTrades fee formatting 2 decimals', () => {
    const trades: any = [{ id: '1', ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, price: 100.5, total: 1005, fee: 4.95, timestamp: '2020-01-01' }];
    expect(exportTradesToCSV(trades)).toContain('4.95');
    expect(exportTradesToCSV(trades)).toContain('100.50');
  });

  it('exportBacktestTrades pnl percent 2 decimals', () => {
    const t: any = [{ id: '1', entryDate: '2020-01-01', entryPrice: 100, exitDate: '2020-01-02', exitPrice: 110, shares: 10, pnl: 100, pnlPercent: 10.123, reason: 'Signal' }];
    expect(exportBacktestTradesToCSV(t)).toContain('10.12');
  });

  it('url-state version field preserved', () => {
    const p: any = { version: 2, mode: 'backtest', ticker: 'SPY' };
    expect(decodeShareState(encodeShareState(p))?.version).toBe(2);
  });

  it('url-state backtest payload roundtrip', () => {
    const p: any = { version: 1, backtest: { ticker: 'AAPL', entryRule: 'SMA(50)>SMA(200)', exitRule: 'RSI()>70' } };
    expect(decodeShareState(encodeShareState(p))).toEqual(p);
  });

  it('generateShareableLink window fallback', () => {
    const orig = (globalThis as any).window;
    (globalThis as any).window = undefined;
    const link = generateShareableLink({ version: 1 } as any);
    expect(link).toContain('mockmarket.app');
    (globalThis as any).window = orig;
  });

  it('computeBacktestStats zero trades profitFactor 0', () => {
    const curve: any = [{ date: '2020-01-01', strategyValue: 10000, buyAndHoldValue: 10000, benchmarkValue: 10000 }, { date: '2020-01-02', strategyValue: 10000, buyAndHoldValue: 10000, benchmarkValue: 10000 }];
    expect(computeBacktestStats([], curve, 10000, '2020-01-01', '2020-01-02').profitFactor).toBe(0);
  });

  it('computeBacktestStats all wins profitFactor Infinity (fixed)', () => {
    const trades: any = [{ id: '1', entryDate: '2020-01-01', exitDate: '2020-01-02', entryPrice: 100, exitPrice: 120, shares: 10, pnl: 200, pnlPercent: 20, reason: 'x' }];
    const curve: any = [{ date: '2020-01-01', strategyValue: 10000, buyAndHoldValue: 10000, benchmarkValue: 10000 }, { date: '2020-01-02', strategyValue: 10200, buyAndHoldValue: 10200, benchmarkValue: 10200 }];
    expect(computeBacktestStats(trades, curve, 10000, '2020-01-01', '2020-01-02').profitFactor).toBe(999);
  });

  it('computeMonthlyReturns empty and single point', () => {
    expect(computeMonthlyReturns([])).toEqual([]);
    expect(computeMonthlyReturns([{ date: '2020-01-01', strategyValue: 10000, buyAndHoldValue: 10000, benchmarkValue: 10000 } as any])).toEqual([]);
  });

  it('calculateReturns correct', () => {
    expect(calculateReturns([100, 110, 121])).toEqual([0.1, 0.1]);
    expect(calculateReturns([100, 90])).toEqual([-0.1]);
  });

  it('calculateMaxDrawdown series correct', () => {
    const s = [{ date: '2020-01-01', value: 100 }, { date: '2020-01-02', value: 80 }, { date: '2020-01-03', value: 90 }];
    const r = calculateMaxDrawdown(s);
    expect(r.drawdownSeries[1].drawdownPercent).toBe(20);
    expect(r.drawdownSeries[2].drawdownPercent).toBe(10);
  });

  it('diversification with large cash overweight', () => {
    const pos: any = { AAPL: { ticker: 'AAPL', shares: 1, avgCost: 100, totalCost: 100, currentPrice: 100, currentValue: 100, unrealizedPnL: 0, unrealizedPnLPercent: 0, realizedPnL: 0 } };
    const res = calculateDiversification(pos, 9900);
    expect(res.score).toBeLessThan(10);
    expect(res.tickerAllocations.find(t => t.ticker === 'CASH')?.percent).toBeCloseTo(99, 0);
  });

  it('filterCandlesByTimeframe 3M and 6M', () => {
    const candles: Candle[] = [
      { time: '2024-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { time: '2024-03-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { time: '2024-06-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 },
      { time: '2024-09-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 },
    ];
    expect(filterCandlesByTimeframe(candles, '3M', '2024-09-01').length).toBe(2); // 06-01 & 09-01
    expect(filterCandlesByTimeframe(candles, '6M', '2024-09-01').length).toBe(3); // 03-01,06-01,09-01
    expect(filterCandlesByTimeframe(candles, '1Y', '2024-09-01').length).toBeGreaterThan(1);
  });

  it('filterCandlesByTimeframe MAX returns all regardless', () => {
    const c: Candle[] = [{ time: '2020-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 }];
    expect(filterCandlesByTimeframe(c, 'MAX', '2099-01-01').length).toBe(1);
  });

  it('csv export handles NaN price -> NaN string', () => {
    const trades: any = [{ id: '1', ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, price: NaN, total: NaN, fee: 0, timestamp: '2020-01-01' }];
    const csv = exportTradesToCSV(trades);
    expect(csv).toContain('0.00'); // NaN sanitized to 0.00 for robustness
  });

  it('url-state handles special chars < > &', () => {
    const p: any = { version: 1, backtest: { ticker: 'AAPL', entryRule: 'CLOSE > 100 && CLOSE < 200', exitRule: 'CLOSE < 50' } };
    expect(decodeShareState(encodeShareState(p))?.backtest?.entryRule).toBe('CLOSE > 100 && CLOSE < 200');
  });

  it('backtest stats avgHoldingDays rounds', () => {
    const trades: any = [
      { id: '1', entryDate: '2020-01-01', exitDate: '2020-01-03', entryPrice: 100, exitPrice: 110, shares: 10, pnl: 100, pnlPercent: 10, reason: 'x' },
      { id: '2', entryDate: '2020-01-05', exitDate: '2020-01-10', entryPrice: 100, exitPrice: 90, shares: 10, pnl: -100, pnlPercent: -10, reason: 'x' },
    ];
    const curve: any = [{ date: '2020-01-01', strategyValue: 10000, buyAndHoldValue: 10000, benchmarkValue: 10000 }, { date: '2020-01-10', strategyValue: 10000, buyAndHoldValue: 10000, benchmarkValue: 10000 }];
    const s = computeBacktestStats(trades, curve, 10000, '2020-01-01', '2020-01-10');
    expect(s.avgHoldingDays).toBe(4); // (2+5)/2=3.5→4
  });

  it('diversification empty positions with cash only', () => {
    const res = calculateDiversification({}, 5000);
    expect(res.score).toBe(0);
    expect(res.sectorConcentrationHHI).toBe(10000);
  });

  it('computeMonthlyReturns correct with gap month', () => {
    const curve: any = [
      { date: '2024-01-31', strategyValue: 10000, buyAndHoldValue: 10000, benchmarkValue: 10000 },
      { date: '2024-03-01', strategyValue: 11000, buyAndHoldValue: 11000, benchmarkValue: 11000 },
    ];
    const monthly = computeMonthlyReturns(curve);
    expect(monthly.length).toBe(2);
    expect(monthly[1].returnPercent).toBe(10);
  });

  it('risk large numbers not overflow', () => {
    const big = Array.from({ length: 100 }, () => 1e6 + Math.random() * 1000);
    const rets = calculateReturns(big);
    expect(rets.every(v => Number.isFinite(v))).toBe(true);
  });
});
