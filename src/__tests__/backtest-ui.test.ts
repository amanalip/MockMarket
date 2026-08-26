import { describe, it, expect } from 'vitest';
import { computeMonthlyReturns } from '../engine/backtester/stats';
import { BacktestEquityPoint } from '../model/types';

describe('Backtest Results UI & Data Formatting', () => {
  it('computes monthly return percentages across years', () => {
    const equityCurve: BacktestEquityPoint[] = [
      { date: '2024-01-02', strategyValue: 100000, buyAndHoldValue: 100000, benchmarkValue: 100000 },
      { date: '2024-01-31', strategyValue: 105000, buyAndHoldValue: 102000, benchmarkValue: 101000 },
      { date: '2024-02-01', strategyValue: 105000, buyAndHoldValue: 102000, benchmarkValue: 101000 },
      { date: '2024-02-28', strategyValue: 110000, buyAndHoldValue: 103000, benchmarkValue: 102000 },
    ];

    const monthly = computeMonthlyReturns(equityCurve);
    expect(monthly.length).toBe(2);

    // Jan return: (105000 - 100000) / 100000 = 5%
    expect(monthly[0].month).toBe(1);
    expect(monthly[0].returnPercent).toBe(5);

    // Feb return: (110000 - 105000) / 105000 = 4.76%
    expect(monthly[1].month).toBe(2);
    expect(monthly[1].returnPercent).toBeCloseTo(4.76, 1);
  });
});
