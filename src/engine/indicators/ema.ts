import { Candle } from '../../model/types';
import { IndicatorPoint } from './sma';

export function calculateEMA(candles: Candle[], period = 12): IndicatorPoint[] {
  if (!Number.isFinite(period) || !Number.isInteger(period) || period <= 0) return [];
  if (candles.length < period) return [];

  const results: IndicatorPoint[] = [];
  const multiplier = 2 / (period + 1);

  // Initialize first EMA value with SMA of the first `period` elements
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let currentEMA = sum / period;

  results.push({
    time: candles[period - 1].time,
    value: Number(currentEMA.toFixed(2)),
  });

  for (let i = period; i < candles.length; i++) {
    currentEMA = (candles[i].close - currentEMA) * multiplier + currentEMA;
    results.push({
      time: candles[i].time,
      value: Number(currentEMA.toFixed(2)),
    });
  }

  return results;
}
