import { Candle } from '../../model/types';
import { IndicatorPoint } from './sma';

export function calculateVolumeMA(candles: Candle[], period = 20): IndicatorPoint[] {
  if (!Number.isFinite(period) || !Number.isInteger(period) || period <= 0) return [];
  if (candles.length < period) return [];

  const results: IndicatorPoint[] = [];
  let sum = 0;
  const getVol = (idx: number): number => {
    const v = candles[idx]?.volume;
    return Number.isFinite(v) && (v as number) >= 0 ? (v as number) : 0;
  };
  for (let i = 0; i < candles.length; i++) {
    sum += getVol(i);

    if (i >= period) {
      sum -= getVol(i - period);
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
