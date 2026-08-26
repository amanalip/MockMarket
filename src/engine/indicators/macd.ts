import { Candle } from '../../model/types';
import { calculateEMA } from './ema';

export interface MACDPoint {
  time: string;
  macd: number;
  signal: number;
  histogram: number;
}

export function calculateMACD(
  candles: Candle[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDPoint[] {
  if (candles.length < slowPeriod + signalPeriod) return [];

  const fastEMA = calculateEMA(candles, fastPeriod);
  const slowEMA = calculateEMA(candles, slowPeriod);

  // Align Fast and Slow EMA by time
  const fastMap = new Map<string, number>();
  fastEMA.forEach((p) => fastMap.set(p.time, p.value));

  const macdSeries: { time: string; close: number }[] = [];
  slowEMA.forEach((p) => {
    const fastVal = fastMap.get(p.time);
    if (fastVal !== undefined) {
      macdSeries.push({
        time: p.time,
        close: fastVal - p.value,
      });
    }
  });

  if (macdSeries.length < signalPeriod) return [];

  // Calculate Signal Line (EMA of MACD line)
  // Adapt calculateEMA for macd series
  const signalMultiplier = 2 / (signalPeriod + 1);
  let sum = 0;
  for (let i = 0; i < signalPeriod; i++) {
    sum += macdSeries[i].close;
  }
  let currentSignal = sum / signalPeriod;

  const results: MACDPoint[] = [];
  const macdValAtSignalStart = macdSeries[signalPeriod - 1].close;
  results.push({
    time: macdSeries[signalPeriod - 1].time,
    macd: Number(macdValAtSignalStart.toFixed(2)),
    signal: Number(currentSignal.toFixed(2)),
    histogram: Number((macdValAtSignalStart - currentSignal).toFixed(2)),
  });

  for (let i = signalPeriod; i < macdSeries.length; i++) {
    currentSignal = (macdSeries[i].close - currentSignal) * signalMultiplier + currentSignal;
    const macdVal = macdSeries[i].close;
    results.push({
      time: macdSeries[i].time,
      macd: Number(macdVal.toFixed(2)),
      signal: Number(currentSignal.toFixed(2)),
      histogram: Number((macdVal - currentSignal).toFixed(2)),
    });
  }

  return results;
}
