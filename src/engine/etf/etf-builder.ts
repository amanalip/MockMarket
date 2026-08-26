import { Candle, CustomETFConfig, RebalanceFrequency } from '../../model/types';
import { calculateReturns, calculateAnnualizedVolatility } from '../risk/volatility';
import { calculateSharpeRatio } from '../risk/var';
import { calculateMaxDrawdown } from '../risk/drawdown';

export interface ETFDriftPoint {
  date: string;
  weights: Record<string, number>; // ticker -> percentage (0 - 100)
}

export interface ETFPerformancePoint {
  date: string;
  nav: number;
}

export interface ETFMetrics {
  totalReturnPercent: number;
  annualizedReturnPercent: number;
  annualizedVolatility: number;
  sharpeRatio: number;
  maxDrawdownPercent: number;
}

export interface ETFSimulationResult {
  config: CustomETFConfig;
  navHistory: ETFPerformancePoint[];
  driftHistory: ETFDriftPoint[];
  metrics: ETFMetrics;
  startDate: string;
  endDate: string;
}

function isRebalanceDate(
  currentDateStr: string,
  prevDateStr: string | undefined,
  freq: RebalanceFrequency
): boolean {
  if (!prevDateStr || freq === 'never') return false;

  const cur = new Date(currentDateStr);
  const prev = new Date(prevDateStr);

  if (freq === 'monthly') {
    return cur.getMonth() !== prev.getMonth();
  }
  if (freq === 'quarterly') {
    const curQ = Math.floor(cur.getMonth() / 3);
    const prevQ = Math.floor(prev.getMonth() / 3);
    return curQ !== prevQ || cur.getFullYear() !== prev.getFullYear();
  }
  if (freq === 'annually') {
    return cur.getFullYear() !== prev.getFullYear();
  }

  return false;
}

export function normalizeWeights(
  tickers: { ticker: string; targetWeight: number }[]
): { ticker: string; targetWeight: number }[] {
  const sum = tickers.reduce((acc, t) => acc + t.targetWeight, 0);
  if (sum === 0) {
    const equal = Number((100 / tickers.length).toFixed(2));
    return tickers.map((t) => ({ ticker: t.ticker, targetWeight: equal }));
  }
  return tickers.map((t) => ({
    ticker: t.ticker,
    targetWeight: Number(((t.targetWeight / sum) * 100).toFixed(2)),
  }));
}

export function simulateETF(
  config: CustomETFConfig,
  candleDataMap: Record<string, Candle[]>,
  startDate?: string,
  endDate?: string
): ETFSimulationResult {
  const constituents = config.tickers.filter((t) => candleDataMap[t.ticker]?.length > 0);
  if (constituents.length === 0) {
    throw new Error('No valid ticker data available for ETF construction.');
  }

  // Find common overlapping dates across all selected tickers
  const dateSets = constituents.map(
    (c) => new Set(candleDataMap[c.ticker].map((k) => k.time))
  );

  const firstTickerDates = candleDataMap[constituents[0].ticker].map((k) => k.time);
  const commonDates = firstTickerDates.filter((date) => {
    if (startDate && date < startDate) return false;
    if (endDate && date > endDate) return false;
    return dateSets.every((set) => set.has(date));
  });

  if (commonDates.length < 5) {
    throw new Error('Insufficient overlapping trading dates for the selected assets.');
  }

  // Build price lookup map: ticker -> (date -> close)
  const priceMap: Record<string, Map<string, number>> = {};
  const normalizedConstituents = normalizeWeights(constituents);

  normalizedConstituents.forEach((c) => {
    const map = new Map<string, number>();
    candleDataMap[c.ticker].forEach((candle) => map.set(candle.time, candle.close));
    priceMap[c.ticker] = map;
  });

  const initialNAV = 100.0;
  const navHistory: ETFPerformancePoint[] = [];
  const driftHistory: ETFDriftPoint[] = [];

  // Track invested dollar amounts per asset
  const assetValues: Record<string, number> = {};
  normalizedConstituents.forEach((c) => {
    assetValues[c.ticker] = initialNAV * (c.targetWeight / 100);
  });

  navHistory.push({ date: commonDates[0], nav: initialNAV });
  const initialWeights: Record<string, number> = {};
  normalizedConstituents.forEach((c) => {
    initialWeights[c.ticker] = c.targetWeight;
  });
  driftHistory.push({ date: commonDates[0], weights: initialWeights });

  for (let i = 1; i < commonDates.length; i++) {
    const prevDate = commonDates[i - 1];
    const curDate = commonDates[i];

    // Check if rebalancing should trigger on start of this period
    if (isRebalanceDate(curDate, prevDate, config.rebalanceFrequency)) {
      const currentNAV = Object.values(assetValues).reduce((sum, v) => sum + v, 0);
      normalizedConstituents.forEach((c) => {
        assetValues[c.ticker] = currentNAV * (c.targetWeight / 100);
      });
    }

    // Apply daily asset returns
    let dailyNAV = 0;
    const currentWeights: Record<string, number> = {};

    normalizedConstituents.forEach((c) => {
      const prevPrice = priceMap[c.ticker].get(prevDate)!;
      const curPrice = priceMap[c.ticker].get(curDate)!;
      const ret = prevPrice > 0 ? (curPrice - prevPrice) / prevPrice : 0;

      assetValues[c.ticker] *= (1 + ret);
      dailyNAV += assetValues[c.ticker];
    });

    normalizedConstituents.forEach((c) => {
      const w = dailyNAV > 0 ? (assetValues[c.ticker] / dailyNAV) * 100 : 0;
      currentWeights[c.ticker] = Number(w.toFixed(2));
    });

    navHistory.push({ date: curDate, nav: Number(dailyNAV.toFixed(2)) });
    driftHistory.push({ date: curDate, weights: currentWeights });
  }

  // Performance calculations
  const finalNAV = navHistory[navHistory.length - 1].nav;
  const totalReturnPercent = Number((((finalNAV - initialNAV) / initialNAV) * 100).toFixed(2));

  const startTs = new Date(commonDates[0]).getTime();
  const endTs = new Date(commonDates[commonDates.length - 1]).getTime();
  const years = Math.max(0.1, (endTs - startTs) / (365.25 * 24 * 3600 * 1000));
  const annualizedReturnPercent = Number(((Math.pow(Math.max(0.001, finalNAV / initialNAV), 1 / years) - 1) * 100).toFixed(2));

  const navSeries = navHistory.map((p) => p.nav);
  const dailyReturns = calculateReturns(navSeries);
  const annualizedVolatility = calculateAnnualizedVolatility(dailyReturns);
  const sharpeRatio = calculateSharpeRatio(dailyReturns);

  const ddSeries = navHistory.map((p) => ({ date: p.date, value: p.nav }));
  const maxDrawdown = calculateMaxDrawdown(ddSeries);

  return {
    config: {
      ...config,
      tickers: normalizedConstituents,
    },
    navHistory,
    driftHistory,
    metrics: {
      totalReturnPercent,
      annualizedReturnPercent,
      annualizedVolatility,
      sharpeRatio,
      maxDrawdownPercent: maxDrawdown.maxDrawdownPercent,
    },
    startDate: commonDates[0],
    endDate: commonDates[commonDates.length - 1],
  };
}
