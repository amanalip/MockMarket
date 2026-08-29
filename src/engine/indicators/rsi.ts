import { Candle } from '../../model/types';
import { IndicatorPoint } from './sma';

export function calculateRSI(candles: Candle[], period = 14): IndicatorPoint[] {
  if (!Number.isFinite(period) || !Number.isInteger(period) || period <= 0) return [];
  if (candles.length <= period) return [];

  const results: IndicatorPoint[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    gains.push(diff > 0 ? diff : 0);
    losses.push(diff < 0 ? Math.abs(diff) : 0);
  }

  // Initial average gain and average loss
  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 0; i < period; i++) {
    avgGain += gains[i];
    avgLoss += losses[i];
  }
  avgGain /= period;
  avgLoss /= period;

  // Flat price (both avgGain and avgLoss 0) should be 50 neutral, not 100
  let rsi: number;
  let rs: number;
  if (avgGain === 0 && avgLoss === 0) {
    rsi = 50;
    rs = 1;
  } else if (avgLoss === 0) {
    rsi = 100;
    rs = 100;
  } else {
    rs = avgGain / avgLoss;
    rsi = 100 - 100 / (1 + rs);
  }

  results.push({
    time: candles[period].time,
    value: Number(rsi.toFixed(2)),
  });

  // Wilder's smoothing technique for subsequent periods
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

    if (avgGain === 0 && avgLoss === 0) {
      rsi = 50;
    } else if (avgLoss === 0) {
      rsi = 100;
    } else {
      rs = avgGain / avgLoss;
      rsi = 100 - 100 / (1 + rs);
    }

    results.push({
      time: candles[i + 1].time,
      value: Number(rsi.toFixed(2)),
    });
  }

  return results;
}
