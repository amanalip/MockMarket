import { Candle } from '../../model/types';

export type DCAInterval = 'none' | 'weekly' | 'monthly';
export type AnnualizedReturnMethod = 'cagr' | 'xirr';

interface CashFlow {
  date: string;
  amount: number;
}

export interface TimeMachineConfig {
  ticker: string;
  startDate: string;
  endDate: string;
  initialAmount: number;
  dcaAmount?: number;
  dcaInterval?: DCAInterval;
}

export interface TimeMachineGrowthPoint {
  date: string;
  investedCash: number;
  assetValue: number;
  benchmarkValue: number;
}

export interface TimeMachineMilestone {
  title: string;
  date: string;
  description: string;
}

export interface TimeMachineResult {
  config: TimeMachineConfig;
  totalCashInvested: number;
  finalAssetValue: number;
  finalBenchmarkValue: number;
  totalReturnPercent: number;
  benchmarkReturnPercent: number;
  totalProfitDollars: number;
  annualizedReturnPercent: number;
  annualizedReturnMethod: AnnualizedReturnMethod;
  /** @deprecated Use annualizedReturnPercent and annualizedReturnMethod. */
  cagrPercent: number;
  growthCurve: TimeMachineGrowthPoint[];
  milestones: TimeMachineMilestone[];
}

function calculateXirr(cashFlows: CashFlow[]): number {
  const combined = new Map<number, number>();
  for (const cashFlow of cashFlows) {
    const timestamp = Date.parse(`${cashFlow.date}T00:00:00Z`);
    if (Number.isFinite(timestamp) && Number.isFinite(cashFlow.amount)) {
      combined.set(timestamp, (combined.get(timestamp) ?? 0) + cashFlow.amount);
    }
  }

  const datedFlows = [...combined]
    .map(([timestamp, amount]) => ({ timestamp, amount }))
    .filter((cashFlow) => Math.abs(cashFlow.amount) > 1e-10)
    .sort((a, b) => a.timestamp - b.timestamp);

  if (
    datedFlows.length < 2
    || !datedFlows.some((cashFlow) => cashFlow.amount < 0)
    || !datedFlows.some((cashFlow) => cashFlow.amount > 0)
  ) {
    return 0;
  }

  const firstTimestamp = datedFlows[0].timestamp;
  const npvAtLogRate = (logRate: number) => datedFlows.reduce((npv, cashFlow) => {
    const years = (cashFlow.timestamp - firstTimestamp) / (365 * 24 * 60 * 60 * 1000);
    return npv + cashFlow.amount * Math.exp(-years * logRate);
  }, 0);

  // logRate = log(1 + rate) keeps the full valid domain (-1, infinity)
  // bracketed and avoids the convergence failures common with Newton-only XIRR.
  let low = -50;
  let high = 1;
  let lowNpv = npvAtLogRate(low);
  let highNpv = npvAtLogRate(high);

  while (lowNpv * highNpv > 0 && high < 700) {
    high = Math.min(700, high * 2);
    highNpv = npvAtLogRate(high);
  }

  if (!Number.isFinite(lowNpv) || lowNpv > 0) {
    lowNpv = Number.POSITIVE_INFINITY;
  }
  if (lowNpv * highNpv > 0) {
    return 0;
  }

  for (let iteration = 0; iteration < 200; iteration++) {
    const midpoint = (low + high) / 2;
    const midpointNpv = npvAtLogRate(midpoint);
    if (midpointNpv > 0) {
      low = midpoint;
    } else {
      high = midpoint;
    }
  }

  return Math.expm1((low + high) / 2);
}

export function calculateTimeMachine(
  tickerCandles: Candle[],
  benchmarkCandles: Candle[],
  config: TimeMachineConfig
): TimeMachineResult {
  const filtered = tickerCandles.filter(
    (c) => c.time >= config.startDate && c.time <= config.endDate
  );

  if (filtered.length < 2) {
    throw new Error('Insufficient simulation data for the selected time range.');
  }

  const validBenchmarkCandles = benchmarkCandles
    .filter((c) => Number.isFinite(c.close) && c.close > 0)
    .sort((a, b) => a.time.localeCompare(b.time));

  if (!Number.isFinite(config.initialAmount) || config.initialAmount < 0) {
    throw new Error('Initial amount must be non-negative finite');
  }
  if (filtered[0].close <= 0 || !Number.isFinite(filtered[0].close)) {
    throw new Error('Invalid initial price');
  }
  let totalCashInvested = config.initialAmount;
  let assetShares = config.initialAmount / filtered[0].close;
  const cashFlows: CashFlow[] = config.initialAmount > 0
    ? [{ date: filtered[0].time, amount: -config.initialAmount }]
    : [];

  let benchmarkIndex = -1;
  while (benchmarkIndex + 1 < validBenchmarkCandles.length && validBenchmarkCandles[benchmarkIndex + 1].time <= filtered[0].time) {
    benchmarkIndex++;
  }
  const initialBenchPrice = benchmarkIndex >= 0 ? validBenchmarkCandles[benchmarkIndex].close : 100;
  let latestBenchPrice = initialBenchPrice;
  let benchmarkShares = config.initialAmount / initialBenchPrice;

  const growthCurve: TimeMachineGrowthPoint[] = [];
  const milestones: TimeMachineMilestone[] = [];

  let lastDcaMonth = new Date(filtered[0].time).getUTCMonth();
  let lastDcaYear = new Date(filtered[0].time).getUTCFullYear();
  let lastDcaWeek = Math.floor(new Date(filtered[0].time).getTime() / (7 * 24 * 3600 * 1000));
  let peakValue = config.initialAmount;
  let maxDrawdown = 0;
  let maxDrawdownDate = filtered[0].time;
  let hasDoubled = false;

  for (let i = 0; i < filtered.length; i++) {
    const candle = filtered[i];
    while (benchmarkIndex + 1 < validBenchmarkCandles.length && validBenchmarkCandles[benchmarkIndex + 1].time <= candle.time) {
      benchmarkIndex++;
      latestBenchPrice = validBenchmarkCandles[benchmarkIndex].close;
    }
    const benchPrice = latestBenchPrice;
    const curDate = new Date(candle.time);

    // Check DCA periodic contribution
    if (i > 0 && config.dcaAmount && config.dcaAmount > 0 && config.dcaInterval && config.dcaInterval !== 'none') {
      let isDcaTime = false;

      if (config.dcaInterval === 'monthly') {
        const curMonth = curDate.getUTCMonth();
        const curYear = curDate.getUTCFullYear();
        if (curMonth !== lastDcaMonth || curYear !== lastDcaYear) {
          isDcaTime = true;
          lastDcaMonth = curMonth;
          lastDcaYear = curYear;
        }
      } else if (config.dcaInterval === 'weekly') {
        const curWeek = Math.floor(curDate.getTime() / (7 * 24 * 3600 * 1000));
        if (curWeek !== lastDcaWeek) {
          isDcaTime = true;
          lastDcaWeek = curWeek;
        }
      }

      if (isDcaTime) {
        const safeDca = Number.isFinite(config.dcaAmount) && (config.dcaAmount as number) > 0 ? (config.dcaAmount as number) : 0;
        if (safeDca > 0 && Number.isFinite(candle.close) && candle.close > 0 && Number.isFinite(benchPrice) && benchPrice > 0) {
          totalCashInvested += safeDca;
          assetShares += safeDca / candle.close;
          benchmarkShares += safeDca / benchPrice;
          cashFlows.push({ date: candle.time, amount: -safeDca });
        }
      }
    }

    const safeClose = Number.isFinite(candle.close) && candle.close > 0 ? candle.close : (Number.isFinite(benchPrice) && benchPrice > 0 ? benchPrice : 1);
    const currentAssetVal = assetShares * safeClose;
    const currentBenchVal = benchmarkShares * benchPrice;

    // Track milestones
    if (!hasDoubled && currentAssetVal >= totalCashInvested * 2) {
      hasDoubled = true;
      milestones.push({
        title: 'Investment Doubled (2x)',
        date: candle.time,
        description: `Your investment crossed 100% gain, reaching $${currentAssetVal.toLocaleString('en-US', { maximumFractionDigits: 0 })}.`,
      });
    }

    if (currentAssetVal > peakValue) {
      peakValue = currentAssetVal;
    } else {
      const dd = ((peakValue - currentAssetVal) / peakValue) * 100;
      if (dd > maxDrawdown) {
        maxDrawdown = dd;
        maxDrawdownDate = candle.time;
      }
    }

    growthCurve.push({
      date: candle.time,
      investedCash: Number(totalCashInvested.toFixed(2)),
      assetValue: Number(currentAssetVal.toFixed(2)),
      benchmarkValue: Number(currentBenchVal.toFixed(2)),
    });
  }

  if (maxDrawdown > 15) {
    milestones.push({
      title: `Maximum Pullback (-${maxDrawdown.toFixed(1)}%)`,
      date: maxDrawdownDate,
      description: `Largest peak-to-trough decline experienced during this holding horizon.`,
    });
  }

  const finalAssetValue = growthCurve[growthCurve.length - 1].assetValue;
  const finalBenchmarkValue = growthCurve[growthCurve.length - 1].benchmarkValue;

  const totalReturnPercent = totalCashInvested > 0 ? Number((((finalAssetValue - totalCashInvested) / totalCashInvested) * 100).toFixed(2)) : 0;
  const benchmarkReturnPercent = totalCashInvested > 0 ? Number((((finalBenchmarkValue - totalCashInvested) / totalCashInvested) * 100).toFixed(2)) : 0;
  const totalProfitDollars = Number((finalAssetValue - totalCashInvested).toFixed(2));

  const startTs = new Date(filtered[0].time).getTime();
  const endTs = new Date(filtered[filtered.length - 1].time).getTime();
  const rawYears = (endTs - startTs) / (365.25 * 24 * 3600 * 1000);
  const years = Math.max(1 / 365.25, rawYears);
  const equityRatio = totalCashInvested > 0 ? finalAssetValue / totalCashInvested : 0;
  const rawCagr = equityRatio <= 0 ? -1 : Math.pow(equityRatio, 1 / years) - 1;
  const cagrPercent = Number((rawCagr * 100).toFixed(2));
  const hasRecurringContributions = cashFlows.length > (config.initialAmount > 0 ? 1 : 0);
  const annualizedReturnMethod: AnnualizedReturnMethod = hasRecurringContributions ? 'xirr' : 'cagr';
  const rawAnnualizedReturn = hasRecurringContributions
    ? calculateXirr([...cashFlows, { date: filtered[filtered.length - 1].time, amount: finalAssetValue }])
    : rawCagr;
  const annualizedReturnPercent = Number((rawAnnualizedReturn * 100).toFixed(2));

  return {
    config,
    totalCashInvested: Number(totalCashInvested.toFixed(2)),
    finalAssetValue: Number(finalAssetValue.toFixed(2)),
    finalBenchmarkValue: Number(finalBenchmarkValue.toFixed(2)),
    totalReturnPercent,
    benchmarkReturnPercent,
    totalProfitDollars,
    annualizedReturnPercent,
    annualizedReturnMethod,
    cagrPercent,
    growthCurve,
    milestones,
  };
}
