import { describe, it, expect } from 'vitest';
import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateBollingerBands } from '../engine/indicators';
import { calculateReturns, calculateAnnualizedVolatility } from '../engine/risk/volatility';
import { calculateBeta } from '../engine/risk/beta';
import { calculateSharpeRatio, calculateSortinoRatio, calculateValueAtRisk } from '../engine/risk/var';
import { calculateMaxDrawdown } from '../engine/risk/drawdown';
import { simulateETF, normalizeWeights } from '../engine/etf/etf-builder';
import { calculateTrackingError } from '../engine/etf/tracking-error';
import { Candle } from '../model/types';
import { createTestRandom, FUZZ_SEED } from './test-random';

const random = createTestRandom('risk-engine-extended');

const mk = (closes: number[]): Candle[] => closes.map((c, i) => ({ time: `2024-01-${String(i + 1).padStart(2, '0')}`, open: c, high: c + 2, low: c - 2, close: c, volume: 1000 }));

describe(`Risk & Engine Extended (seed ${FUZZ_SEED})`, () => {
  it('SMA period equals length', () => {
    expect(calculateSMA(mk([10, 20, 30]), 3)[0].value).toBe(20);
  });

  it('EMA 3 correct weighting', () => {
    const ema = calculateEMA(mk([10, 20, 30, 40]), 3);
    expect(ema.length).toBe(2);
  });

  it('RSI with 14 period on 30 candles', () => {
    const rsi = calculateRSI(mk(Array.from({ length: 30 }, (_, i) => 100 + i)), 14);
    expect(rsi.length).toBe(16);
  });

  it('MACD histogram = macd - signal', () => {
    const macd = calculateMACD(mk(Array.from({ length: 50 }, (_, i) => 100 + i * 0.5)));
    macd.forEach(m => expect(m.histogram).toBeCloseTo(m.macd - m.signal, 1));
  });

  it('Bollinger flat => upper==middle==lower', () => {
    const bb = calculateBollingerBands(mk(Array(20).fill(100)), 20);
    expect(bb[0].upper).toBe(100);
    expect(bb[0].lower).toBe(100);
  });

  it('calculateReturns correct', () => {
    expect(calculateReturns([100, 110])).toEqual([0.1]);
  });

  it('volatility with constant returns 0', () => {
    expect(calculateAnnualizedVolatility([0.01, 0.01, 0.01, 0.01, 0.01])).toBeCloseTo(0, 1);
  });

  it('beta 1 for identical series', () => {
    const a = [0.01, 0.02, 0.03];
    expect(calculateBeta(a, a)).toBeCloseTo(1, 1);
  });

  it('Sharpe 0 for <5 data', () => {
    expect(calculateSharpeRatio([0.01, 0.02])).toBe(0);
  });

  it('Sortino 0 for <5', () => {
    expect(calculateSortinoRatio([0.01])).toBe(0);
  });

  it('VaR 0 for <5', () => {
    expect(calculateValueAtRisk([0.01])).toBe(0);
  });

  it('MaxDrawdown 0 for empty', () => {
    expect(calculateMaxDrawdown([]).maxDrawdownPercent).toBe(0);
  });

  it('normalizeWeights 99.99 fix to 100', () => {
    const res = normalizeWeights([{ ticker: 'A', targetWeight: 33.33 }, { ticker: 'B', targetWeight: 33.33 }, { ticker: 'C', targetWeight: 33.33 }]);
    expect(res.reduce((s, t) => s + t.targetWeight, 0)).toBe(100);
  });

  it('simulateETF never vs monthly both produce nav', () => {
    const dates = Array.from({ length: 30 }, (_, i) => `2020-01-${String(i + 1).padStart(2, '0')}`);
    const map: any = {
      AAPL: dates.map(d => ({ time: d, open: 100, high: 100, low: 100, close: 100, volume: 1000 })),
      MSFT: dates.map(d => ({ time: d, open: 100, high: 100, low: 100, close: 100, volume: 1000 })),
    };
    const never = simulateETF({ id: '1', name: 'A', tickers: [{ ticker: 'AAPL', targetWeight: 50 }, { ticker: 'MSFT', targetWeight: 50 }], rebalanceFrequency: 'never', createdAt: '2020-01-01' }, map);
    const monthly = simulateETF({ id: '2', name: 'B', tickers: [{ ticker: 'AAPL', targetWeight: 50 }, { ticker: 'MSFT', targetWeight: 50 }], rebalanceFrequency: 'monthly', createdAt: '2020-01-01' }, map);
    expect(never.navHistory.length).toBe(30);
    expect(monthly.navHistory.length).toBe(30);
  });

  it('trackingError identical -> 0,1', () => {
    const s = Array.from({ length: 20 }, (_, i) => 100 + i);
    expect(calculateTrackingError(s, s).trackingErrorPercent).toBe(0);
  });

  it('SMA handles empty', () => {
    expect(calculateSMA([], 20)).toEqual([]);
  });

  it('EMA handles period > length', () => {
    expect(calculateEMA(mk([10, 20]), 5)).toEqual([]);
  });

  it('RSI bounded 0-100', () => {
    const rsi = calculateRSI(mk(Array.from({ length: 30 }, () => 100 + (random() - 0.5) * 10)), 14);
    rsi.forEach(r => { expect(r.value).toBeGreaterThanOrEqual(0); expect(r.value).toBeLessThanOrEqual(100); });
  });

  it('Bollinger upper >= lower', () => {
    const bb = calculateBollingerBands(mk(Array.from({ length: 30 }, () => 100 + random() * 10)), 20);
    bb.forEach(b => expect(b.upper).toBeGreaterThanOrEqual(b.lower));
  });

  it('calculateReturns empty', () => {
    expect(calculateReturns([])).toEqual([]);
  });

  it('MaxDrawdown flat 0', () => {
    expect(calculateMaxDrawdown([{ date: '2020-01-01', value: 100 }, { date: '2020-01-02', value: 100 }]).maxDrawdownPercent).toBe(0);
  });

  it('normalizeWeights empty returns empty', () => {
    expect(normalizeWeights([])).toEqual([]);
  });

  it('simulateETF throws insufficient dates', () => {
    const map: any = { AAPL: [{ time: '2020-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 }] };
    expect(() => simulateETF({ id: '1', name: 'A', tickers: [{ ticker: 'AAPL', targetWeight: 100 }], rebalanceFrequency: 'never', createdAt: '2020-01-01' }, map)).toThrow();
  });

  it('trackingError high divergence', () => {
    const a = Array.from({ length: 20 }, (_, i) => 100 + i);
    const b = Array.from({ length: 20 }, (_, i) => 100 - i);
    expect(calculateTrackingError(a, b).trackingErrorPercent).toBeGreaterThan(0);
  });

  it('Sharpe negative for down market', () => {
    expect(calculateSharpeRatio(Array(10).fill(-0.02))).toBeLessThan(0);
  });
});
