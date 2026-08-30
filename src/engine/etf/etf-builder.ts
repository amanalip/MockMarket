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
    return cur.getUTCMonth() !== prev.getUTCMonth() || cur.getUTCFullYear() !== prev.getUTCFullYear();
  }
  if (freq === 'quarterly') {
    const curQ = Math.floor(cur.getUTCMonth() / 3);
    const prevQ = Math.floor(prev.getUTCMonth() / 3);
    return curQ !== prevQ || cur.getUTCFullYear() !== prev.getUTCFullYear();
  }
  if (freq === 'annually') {
    return cur.getUTCFullYear() !== prev.getUTCFullYear();
  }

  return false;
}

export function normalizeWeights(
  tickers: { ticker: string; targetWeight: number }[]
): { ticker: string; targetWeight: number }[] {
  if (tickers.length === 0) return [];
  const sum = tickers.reduce((acc, t) => acc + (Number.isFinite(t.targetWeight) ? Math.max(0, t.targetWeight) : 0), 0);
  if (sum === 0) {
    // Use higher precision to minimize drift for large N, then distribute remainder evenly
    const rawEqual = 100 / tickers.length;
    const base = Math.floor(rawEqual * 100) / 100; // truncate to 2 decimals down
    const result = tickers.map((t) => ({ ticker: t.ticker, targetWeight: base }));
    let remainder = Number((100 - base * tickers.length).toFixed(2));
    // Distribute remainder in 0.01 increments to avoid single-ticker concentration
    let idx = 0;
    while (remainder > 0.0001 && idx < result.length) {
      const add = Math.min(0.01, remainder);
      result[idx].targetWeight = Number((result[idx].targetWeight + add).toFixed(2));
      remainder = Number((remainder - add).toFixed(2));
      idx = (idx + 1) % result.length;
    }
    // Final drift correction
    const drift = Number((100 - result.reduce((s, c) => s + c.targetWeight, 0)).toFixed(2));
    if (Math.abs(drift) > 0.001) {
      result[result.length - 1].targetWeight = Number((result[result.length - 1].targetWeight + drift).toFixed(2));
    }
    return result;
  }
  const result = tickers.map((t) => {
    const safeWeight = Number.isFinite(t.targetWeight) ? Math.max(0, t.targetWeight) : 0;
    return {
      ticker: t.ticker,
      targetWeight: Number(((safeWeight / sum) * 100).toFixed(2)),
    };
  });
  const drift = Number((100 - result.reduce((s, c) => s + c.targetWeight, 0)).toFixed(2));
  if (drift !== 0) {
    result[result.length - 1].targetWeight = Number((result[result.length - 1].targetWeight + drift).toFixed(2));
  }
  return result;
}

export function simulateETF(
  config: CustomETFConfig,
  candleDataMap: Record<string, Candle[]>,
  startDate?: string,
  endDate?: string
): ETFSimulationResult {
  if (!config.tickers || config.tickers.length === 0) {
    throw new Error('ETF must have at least one ticker');
  }
  if (startDate && endDate && startDate > endDate) {
    throw new Error('Start date must be before end date');
  }
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
      const prevPriceRaw = priceMap[c.ticker].get(prevDate);
      const curPriceRaw = priceMap[c.ticker].get(curDate);
      const prevPrice = Number.isFinite(prevPriceRaw) ? prevPriceRaw as number : 0;
      const curPrice = Number.isFinite(curPriceRaw) ? curPriceRaw as number : prevPrice;
      let ret = 0;
      if (prevPrice > 0 && Number.isFinite(curPrice) && Number.isFinite(prevPrice)) {
        ret = (curPrice - prevPrice) / prevPrice;
        if (!Number.isFinite(ret)) ret = 0;
      } else if (prevPrice === 0 && curPrice > 0) {
        // Recovery from zero (e.g., bad data fixed) – treat as 0 to avoid stuck NAV, but allow step
        ret = 0;
      }
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
  const rawYears = (endTs - startTs) / (365.25 * 24 * 3600 * 1000);
  const years = Math.max(1 / 365.25, rawYears);
  const equityRatio = finalNAV / initialNAV;
  const annualizedReturnPercent = equityRatio <= 0 ? -100 : Number(((Math.pow(equityRatio, 1 / years) - 1) * 100).toFixed(2));

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
