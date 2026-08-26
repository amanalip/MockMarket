import { Candle } from '../../model/types';

export interface IndicatorPoint {
  time: string;
  value: number;
}

export function calculateSMA(candles: Candle[], period = 20): IndicatorPoint[] {
  if (candles.length < period || period <= 0) return [];

  const results: IndicatorPoint[] = [];
  let sum = 0;

  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;

    if (i >= period) {
      sum -= candles[i - period].close;
    }

    if (i >= period - 1) {
      const avg = sum / period;
      results.push({
        time: candles[i].time,
        value: Number(avg.toFixed(2)),
      });
    }
  }

  return results;
}
