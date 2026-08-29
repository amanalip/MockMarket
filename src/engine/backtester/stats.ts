import { BacktestStats, BacktestTrade, BacktestEquityPoint } from '../../model/types';
import { calculateMaxDrawdown } from '../risk/drawdown';
import { calculateSharpeRatio, calculateSortinoRatio } from '../risk/var';
import { calculateReturns } from '../risk/volatility';

export function computeBacktestStats(
  trades: BacktestTrade[],
  equityCurve: BacktestEquityPoint[],
  initialCash: number,
  startDate: string,
  endDate: string
): BacktestStats {
  if (equityCurve.length === 0 || initialCash <= 0) {
    return {
      totalReturnPercent: 0,
      cagrPercent: 0,
      benchmarkReturnPercent: 0,
      winRatePercent: 0,
      profitFactor: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdownPercent: 0,
      maxDrawdownDates: { peak: startDate, trough: startDate },
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      avgWinPercent: 0,
      avgLossPercent: 0,
      avgHoldingDays: 0,
    };
  }

  const finalEquity = equityCurve[equityCurve.length - 1].strategyValue;
  const finalBenchmark = equityCurve[equityCurve.length - 1].benchmarkValue;

  const totalReturnPercent = Number((((finalEquity - initialCash) / initialCash) * 100).toFixed(2));
  const benchmarkReturnPercent = Number((((finalBenchmark - initialCash) / initialCash) * 100).toFixed(2));

  const startTs = new Date(startDate).getTime();
  const endTs = new Date(endDate).getTime();
  const years = Math.max(0.1, (endTs - startTs) / (365.25 * 24 * 3600 * 1000));
  const cagr = (Math.pow(Math.max(0.001, finalEquity / initialCash), 1 / years) - 1) * 100;

  const winningTrades = trades.filter((t) => t.pnl > 0);
  const losingTrades = trades.filter((t) => t.pnl < 0);

  const totalTrades = trades.length;
  const winRatePercent = totalTrades > 0
    ? Number(((winningTrades.length / totalTrades) * 100).toFixed(2))
    : 0;

  const grossGains = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
  const grossLosses = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
  const profitFactor = grossLosses > 0
    ? Number((grossGains / grossLosses).toFixed(2))
    : grossGains > 0 ? 99.99 : 0;

  const avgWinPercent = winningTrades.length > 0
    ? Number((winningTrades.reduce((sum, t) => sum + t.pnlPercent, 0) / winningTrades.length).toFixed(2))
    : 0;

  const avgLossPercent = losingTrades.length > 0
    ? Number((losingTrades.reduce((sum, t) => sum + t.pnlPercent, 0) / losingTrades.length).toFixed(2))
    : 0;

  let totalHoldingDays = 0;
  trades.forEach((t) => {
    const d1 = new Date(t.entryDate).getTime();
    const d2 = new Date(t.exitDate).getTime();
    const days = Math.max(1, Math.round((d2 - d1) / (24 * 3600 * 1000)));
    totalHoldingDays += days;
  });
  const avgHoldingDays = totalTrades > 0 ? Math.round(totalHoldingDays / totalTrades) : 0;

  const equitySeries = equityCurve.map((pt) => ({ date: pt.date, value: pt.strategyValue }));
  const ddResult = calculateMaxDrawdown(equitySeries);

  const dailyValues = equityCurve.map((pt) => pt.strategyValue);
  const dailyReturns = calculateReturns(dailyValues);
  const sharpe = calculateSharpeRatio(dailyReturns);
  const sortino = calculateSortinoRatio(dailyReturns);

  return {
    totalReturnPercent,
    cagrPercent: Number(cagr.toFixed(2)),
    benchmarkReturnPercent,
    winRatePercent,
    profitFactor,
    sharpeRatio: sharpe,
    sortinoRatio: sortino,
    maxDrawdownPercent: ddResult.maxDrawdownPercent,
    maxDrawdownDates: {
      peak: ddResult.peakDate || startDate,
      trough: ddResult.troughDate || endDate,
    },
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    avgWinPercent,
    avgLossPercent,
    avgHoldingDays,
  };
}

export function computeMonthlyReturns(
  equityCurve: BacktestEquityPoint[]
): { year: number; month: number; returnPercent: number }[] {
  if (equityCurve.length < 2) return [];

  // Group equity points by year and month
  const monthlyMap = new Map<string, BacktestEquityPoint[]>();

  equityCurve.forEach((pt) => {
    const d = new Date(pt.date);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const key = `${year}-${String(month).padStart(2, '0')}`;
    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, []);
    }
    monthlyMap.get(key)!.push(pt);
  });

  const sortedKeys = Array.from(monthlyMap.keys()).sort();
  const results: { year: number; month: number; returnPercent: number }[] = [];

  let previousMonthEndValue = equityCurve[0].strategyValue;

  sortedKeys.forEach((key, index) => {
    const points = monthlyMap.get(key)!;
    const [yearStr, monthStr] = key.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const monthStartValue = index === 0 ? points[0].strategyValue : previousMonthEndValue;
    const monthEndValue = points[points.length - 1].strategyValue;

    const returnPercent = monthStartValue > 0
      ? ((monthEndValue - monthStartValue) / monthStartValue) * 100
      : 0;

    results.push({
      year,
      month,
      returnPercent: Number(returnPercent.toFixed(2)),
    });

    previousMonthEndValue = monthEndValue;
  });

  return results;
}
