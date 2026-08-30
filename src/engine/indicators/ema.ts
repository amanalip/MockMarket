import { Candle } from '../../model/types';
import { IndicatorPoint } from './sma';

export function calculateEMA(candles: Candle[], period = 12): IndicatorPoint[] {
  if (!Number.isFinite(period) || !Number.isInteger(period) || period <= 0) return [];
  if (candles.length < period) return [];

  const results: IndicatorPoint[] = [];
  const multiplier = 2 / (period + 1);

  const getClose = (idx: number): number => {
    const v = candles[idx]?.close;
    if (Number.isFinite(v)) return v as number;
    for (let k = idx - 1; k >= 0; k--) {
      const pv = candles[k]?.close;
      if (Number.isFinite(pv)) return pv as number;
    }
    return 0;
  };
  // Initialize first EMA value with SMA of the first `period` elements (finite-safe)
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += getClose(i);
  }
  let currentEMA = sum / period;

  results.push({
    time: candles[period - 1].time,
    value: Number(currentEMA.toFixed(2)),
  });

  for (let i = period; i < candles.length; i++) {
    currentEMA = (getClose(i) - currentEMA) * multiplier + currentEMA;
    results.push({
      time: candles[i].time,
      value: Number(currentEMA.toFixed(2)),
    });
  }

  return results;
}
