import { Candle } from '../../model/types';

export interface BollingerBandsPoint {
  time: string;
  upper: number;
  middle: number;
  lower: number;
}

export function calculateBollingerBands(
  candles: Candle[],
  period = 20,
  stdDevMultiplier = 2
): BollingerBandsPoint[] {
  if (candles.length < period || period <= 0) return [];

  const results: BollingerBandsPoint[] = [];

  for (let i = period - 1; i < candles.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += candles[i - j].close;
    }
    const mean = sum / period;

    let varianceSum = 0;
    for (let j = 0; j < period; j++) {
      const diff = candles[i - j].close - mean;
      varianceSum += diff * diff;
    }
    const stdDev = Math.sqrt(varianceSum / period);

    const upper = mean + stdDevMultiplier * stdDev;
    const lower = mean - stdDevMultiplier * stdDev;

    results.push({
      time: candles[i].time,
      upper: Number(upper.toFixed(2)),
      middle: Number(mean.toFixed(2)),
      lower: Number(lower.toFixed(2)),
    });
  }

  return results;
}
