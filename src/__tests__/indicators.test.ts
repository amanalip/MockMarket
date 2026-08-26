import { describe, it, expect } from 'vitest';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateVolumeMA,
} from '../engine/indicators';
import { Candle } from '../model/types';

describe('Technical Indicators Calculation Library', () => {
  // Generate sample 30-day series
  const candles: Candle[] = Array.from({ length: 40 }, (_, i) => {
    const day = String(i + 1).padStart(2, '0');
    const close = 100 + Math.sin(i / 3) * 10 + i * 0.5;
    return {
      time: `2024-01-${day}`,
      open: close - 1,
      high: close + 2,
      low: close - 2,
      close: Number(close.toFixed(2)),
      volume: 100000 + i * 5000,
    };
  });

  describe('SMA (Simple Moving Average)', () => {
    it('returns empty array when candle count is less than period', () => {
      const result = calculateSMA(candles.slice(0, 5), 10);
      expect(result).toEqual([]);
    });

    it('calculates accurate simple moving average', () => {
      const period = 5;
      const result = calculateSMA(candles, period);
      expect(result.length).toBe(candles.length - period + 1);

      // Verify first calculated SMA point matches direct mean
      const firstExpectedSum = candles.slice(0, period).reduce((acc, c) => acc + c.close, 0);
      const firstExpectedSMA = Number((firstExpectedSum / period).toFixed(2));
      expect(result[0].value).toBeCloseTo(firstExpectedSMA, 2);
      expect(result[0].time).toBe(candles[period - 1].time);
    });
  });

  describe('EMA (Exponential Moving Average)', () => {
    it('returns empty array when candles are insufficient', () => {
      expect(calculateEMA(candles.slice(0, 3), 5)).toEqual([]);
    });

    it('calculates exponential moving average with correct multiplier weighting', () => {
      const period = 5;
      const result = calculateEMA(candles, period);
      expect(result.length).toBe(candles.length - period + 1);

      // The first point equals the initial SMA
      const initialSMA = candles.slice(0, period).reduce((acc, c) => acc + c.close, 0) / period;
      expect(result[0].value).toBeCloseTo(initialSMA, 2);

      // Verify second point = (Close - prevEMA) * (2 / (5+1)) + prevEMA
      const multiplier = 2 / (period + 1);
      const expectedSecond = (candles[period].close - initialSMA) * multiplier + initialSMA;
      expect(result[1].value).toBeCloseTo(expectedSecond, 1);
    });
  });

  describe('RSI (Relative Strength Index)', () => {
    it('returns empty array when candles are insufficient', () => {
      expect(calculateRSI(candles.slice(0, 10), 14)).toEqual([]);
    });

    it('calculates values strictly bounded between 0 and 100', () => {
      const result = calculateRSI(candles, 14);
      expect(result.length).toBeGreaterThan(0);
      result.forEach((p) => {
        expect(p.value).toBeGreaterThanOrEqual(0);
        expect(p.value).toBeLessThanOrEqual(100);
      });
    });

    it('computes 100 for continuous monotonic price gains', () => {
      const monotonicUp: Candle[] = Array.from({ length: 20 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        open: 100 + i * 2,
        high: 102 + i * 2,
        low: 99 + i * 2,
        close: 101 + i * 2,
        volume: 1000,
      }));
      const rsi = calculateRSI(monotonicUp, 14);
      expect(rsi.length).toBeGreaterThan(0);
      expect(rsi[rsi.length - 1].value).toBe(100);
    });
  });

  describe('MACD', () => {
    it('calculates macd line, signal line, and histogram', () => {
      const result = calculateMACD(candles, 12, 26, 9);
      expect(result.length).toBeGreaterThan(0);
      result.forEach((p) => {
        expect(typeof p.macd).toBe('number');
        expect(typeof p.signal).toBe('number');
        expect(typeof p.histogram).toBe('number');
        expect(p.histogram).toBeCloseTo(p.macd - p.signal, 1);
      });
    });
  });

  describe('Bollinger Bands', () => {
    it('computes upper, middle, and lower bands where upper >= middle >= lower', () => {
      const result = calculateBollingerBands(candles, 20, 2);
      expect(result.length).toBe(candles.length - 20 + 1);

      result.forEach((p) => {
        expect(p.upper).toBeGreaterThanOrEqual(p.middle);
        expect(p.middle).toBeGreaterThanOrEqual(p.lower);
      });
    });
  });

  describe('Volume MA', () => {
    it('computes moving average of volume correctly', () => {
      const period = 10;
      const result = calculateVolumeMA(candles, period);
      expect(result.length).toBe(candles.length - period + 1);

      const firstSum = candles.slice(0, period).reduce((acc, c) => acc + c.volume, 0);
      expect(result[0].value).toBe(Math.round(firstSum / period));
    });
  });
});
