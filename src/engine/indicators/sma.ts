import { Candle } from '../../model/types';

export interface IndicatorPoint {
  time: string;
  value: number;
}

export function calculateSMA(candles: Candle[], period = 20): IndicatorPoint[] {
  if (!Number.isFinite(period) || !Number.isInteger(period) || period <= 0) return [];
  if (candles.length < period) return [];

  const results: IndicatorPoint[] = [];
  let sum = 0;
  const getClose = (idx: number): number => {
    if (idx < 0 || idx >= candles.length) return 0;
    const v = candles[idx]?.close;
    if (Number.isFinite(v)) return v as number;
    // walk back to previous finite close
    for (let k = idx - 1; k >= 0; k--) {
      const pv = candles[k]?.close;
      if (Number.isFinite(pv)) return pv as number;
    }
    return 0;
  };
  for (let i = 0; i < candles.length; i++) {
    sum += getClose(i);

    if (i >= period) {
      sum -= getClose(i - period);
    }

    if (i >= period - 1) {
      const avg = sum / period;
      results.push({
        time: candles[i].time,
        value: Number.isFinite(avg) ? Number(avg.toFixed(2)) : 0,
      });
    }
  }

  return results;
}
