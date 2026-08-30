import { Candle } from '../../model/types';

export type Timeframe = '1M' | '3M' | '6M' | '1Y' | '5Y' | 'MAX';

export interface ChartCandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface ChartVolumeData {
  time: string;
  value: number;
  color: string;
}

export function toCandlestickData(candles: Candle[]): ChartCandleData[] {
  if (!Array.isArray(candles)) return [];
  return candles
    .filter((c) => c && typeof c.time === 'string' && Number.isFinite(c.open) && Number.isFinite(c.high) && Number.isFinite(c.low) && Number.isFinite(c.close))
    .map((c) => ({
      time: c.time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
}

export function toVolumeData(
  candles: Candle[],
  upColor = 'rgba(16, 185, 129, 0.4)',
  downColor = 'rgba(239, 68, 68, 0.4)'
): ChartVolumeData[] {
  if (!Array.isArray(candles)) return [];
  return candles
    .filter((c) => c && typeof c.time === 'string' && Number.isFinite(c.volume) && Number.isFinite(c.open) && Number.isFinite(c.close))
    .map((c) => {
      const isUp = c.close >= c.open;
      const safeVol = Number.isFinite(c.volume) ? c.volume : 0;
      return {
        time: c.time,
        value: safeVol,
        color: isUp ? upColor : downColor,
      };
    });
}

export function filterCandlesByTimeframe(
  candles: Candle[],
  timeframe: Timeframe,
  referenceDate?: string
): Candle[] {
  if (!Array.isArray(candles) || candles.length === 0) return [];
  if (timeframe === 'MAX') return candles;
  const validTimeframes: Timeframe[] = ['1M', '3M', '6M', '1Y', '5Y', 'MAX'];
  if (!validTimeframes.includes(timeframe)) return [...candles];

  const targetDateStr = referenceDate || candles[candles.length - 1].time;
  const ref = new Date(targetDateStr);
  if (Number.isNaN(ref.getTime())) return [];

  let monthsToSubtract = 0;
  switch (timeframe) {
    case '1M':
      monthsToSubtract = 1;
      break;
    case '3M':
      monthsToSubtract = 3;
      break;
    case '6M':
      monthsToSubtract = 6;
      break;
    case '1Y':
      monthsToSubtract = 12;
      break;
    case '5Y':
      monthsToSubtract = 60;
      break;
  }

  // Avoid month-end overflow (Mar 31 -1M => Feb 28 not Mar 3)
  const cutoff = new Date(ref);
  const originalDay = cutoff.getUTCDate();
  cutoff.setUTCDate(1);
  cutoff.setUTCMonth(cutoff.getUTCMonth() - monthsToSubtract);
  const daysInCutoffMonth = new Date(Date.UTC(cutoff.getUTCFullYear(), cutoff.getUTCMonth() + 1, 0)).getUTCDate();
  cutoff.setUTCDate(Math.min(originalDay, daysInCutoffMonth));
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const filtered = candles.filter((c) => typeof c.time === 'string' && c.time >= cutoffStr && c.time <= targetDateStr);
  return filtered;
}
