import { Candle } from '../../model/types';

export type DCAInterval = 'none' | 'weekly' | 'monthly';

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
  cagrPercent: number;
  growthCurve: TimeMachineGrowthPoint[];
  milestones: TimeMachineMilestone[];
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
    throw new Error('Insufficient historical data for the selected time range.');
  }

  const benchMap = new Map(benchmarkCandles.map((c) => [c.time, c.close]));

  let totalCashInvested = config.initialAmount;
  let assetShares = config.initialAmount / filtered[0].close;

  const initialBenchPrice = benchMap.get(filtered[0].time) || 100;
  let benchmarkShares = config.initialAmount / initialBenchPrice;

  const growthCurve: TimeMachineGrowthPoint[] = [];
  const milestones: TimeMachineMilestone[] = [];

  let lastDcaMonth = new Date(filtered[0].time).getMonth();
  let lastDcaWeek = Math.floor(new Date(filtered[0].time).getTime() / (7 * 24 * 3600 * 1000));
  let peakValue = config.initialAmount;
  let maxDrawdown = 0;
  let maxDrawdownDate = filtered[0].time;
  let hasDoubled = false;

  for (let i = 0; i < filtered.length; i++) {
    const candle = filtered[i];
    const benchPrice = benchMap.get(candle.time) || initialBenchPrice;
    const curDate = new Date(candle.time);

    // Check DCA periodic contribution
    if (i > 0 && config.dcaAmount && config.dcaAmount > 0 && config.dcaInterval && config.dcaInterval !== 'none') {
      let isDcaTime = false;

      if (config.dcaInterval === 'monthly') {
        const curMonth = curDate.getMonth();
        if (curMonth !== lastDcaMonth) {
          isDcaTime = true;
          lastDcaMonth = curMonth;
        }
      } else if (config.dcaInterval === 'weekly') {
        const curWeek = Math.floor(curDate.getTime() / (7 * 24 * 3600 * 1000));
        if (curWeek !== lastDcaWeek) {
          isDcaTime = true;
          lastDcaWeek = curWeek;
        }
      }

      if (isDcaTime) {
        totalCashInvested += config.dcaAmount;
        assetShares += config.dcaAmount / candle.close;
        benchmarkShares += config.dcaAmount / benchPrice;
      }
    }

    const currentAssetVal = assetShares * candle.close;
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

  const totalReturnPercent = Number((((finalAssetValue - totalCashInvested) / totalCashInvested) * 100).toFixed(2));
  const benchmarkReturnPercent = Number((((finalBenchmarkValue - totalCashInvested) / totalCashInvested) * 100).toFixed(2));
  const totalProfitDollars = Number((finalAssetValue - totalCashInvested).toFixed(2));

  const startTs = new Date(filtered[0].time).getTime();
  const endTs = new Date(filtered[filtered.length - 1].time).getTime();
  const years = Math.max(0.1, (endTs - startTs) / (365.25 * 24 * 3600 * 1000));
  const cagrPercent = Number(((Math.pow(Math.max(0.001, finalAssetValue / totalCashInvested), 1 / years) - 1) * 100).toFixed(2));

  return {
    config,
    totalCashInvested: Number(totalCashInvested.toFixed(2)),
    finalAssetValue: Number(finalAssetValue.toFixed(2)),
    finalBenchmarkValue: Number(finalBenchmarkValue.toFixed(2)),
    totalReturnPercent,
    benchmarkReturnPercent,
    totalProfitDollars,
    cagrPercent,
    growthCurve,
    milestones,
  };
}
