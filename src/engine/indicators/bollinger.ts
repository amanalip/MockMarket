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
  if (!Number.isFinite(period) || !Number.isInteger(period) || period <= 0) return [];
  if (!Number.isFinite(stdDevMultiplier) || stdDevMultiplier < 0) return [];
  if (candles.length < period) return [];

  const results: BollingerBandsPoint[] = [];

  const getClose = (idx: number): number => {
    const v = candles[idx]?.close;
    if (Number.isFinite(v)) return v as number;
    for (let k = idx - 1; k >= 0; k--) {
      const pv = candles[k]?.close;
      if (Number.isFinite(pv)) return pv as number;
    }
    return 0;
  };
  for (let i = period - 1; i < candles.length; i++) {
    // Skip window if all closes are non-finite
    let hasValid = false;
    for (let j = 0; j < period; j++) {
      if (Number.isFinite(candles[i - j]?.close)) { hasValid = true; break; }
    }
    if (!hasValid) continue;
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += getClose(i - j);
    }
    const mean = sum / period;

    let varianceSum = 0;
    for (let j = 0; j < period; j++) {
      const diff = getClose(i - j) - mean;
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
