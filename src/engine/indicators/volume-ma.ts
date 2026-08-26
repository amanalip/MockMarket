import { Candle } from '../../model/types';
import { IndicatorPoint } from './sma';

export function calculateVolumeMA(candles: Candle[], period = 20): IndicatorPoint[] {
  if (candles.length < period || period <= 0) return [];

  const results: IndicatorPoint[] = [];
  let sum = 0;

  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].volume;

    if (i >= period) {
      sum -= candles[i - period].volume;
    }

    if (i >= period - 1) {
      const avg = sum / period;
      results.push({
        time: candles[i].time,
        value: Math.round(avg),
      });
    }
  }

  return results;
}
