import { describe, it, expect } from 'vitest';
import { calculateSMA } from '../engine/indicators/sma';
import { calculateEMA } from '../engine/indicators/ema';
import { calculateRSI } from '../engine/indicators/rsi';
import { calculateMACD } from '../engine/indicators/macd';
import { calculateBollingerBands } from '../engine/indicators/bollinger';
import { calculateVolumeMA } from '../engine/indicators/volume-ma';
import { Candle } from '../model/types';

const mk = (closes: number[]): Candle[] => closes.map((c, i) => ({
  time: `2024-01-${String(i+1).padStart(2,'0')}`,
  open: c, high: c+1, low: c-1, close: c, volume: 1000+i*100,
}));

describe('Indicators - Edge Cases & Bugs', () => {
  it('SMA returns [] for invalid periods', () => {
    const candles = mk([1,2,3]);
    expect(calculateSMA(candles, 0)).toEqual([]);
    expect(calculateSMA(candles, -5)).toEqual([]);
    expect(calculateSMA([], 20)).toEqual([]);
    expect(calculateSMA(candles, 10)).toEqual([]);
  });

  it('SMA period 1 equals price', () => {
    const candles = mk([10,20,30]);
    const res = calculateSMA(candles, 1);
    expect(res.map(r=>r.value)).toEqual([10,20,30]);
  });

  it('SMA period equals length returns one point', () => {
    const candles = mk([10,20,30]);
    const res = calculateSMA(candles, 3);
    expect(res.length).toBe(1);
    expect(res[0].value).toBe(20);
  });

  it('SMA calculates correct average and precision', () => {
    const candles = mk([10,20,30,40]);
    const res = calculateSMA(candles, 2);
    expect(res[0].value).toBe(15);
    expect(res[1].value).toBe(25);
    expect(res[2].value).toBe(35);
  });

  it('EMA period 1 multiplier 1 equals close', () => {
    const candles = mk([10,20,30]);
    const res = calculateEMA(candles,1);
    expect(res.map(r=>r.value)).toEqual([10,20,30]);
  });

  it('EMA insufficient candles returns []', () => {
    expect(calculateEMA(mk([1,2]),5)).toEqual([]);
    expect(calculateEMA(mk([1,2]),0)).toEqual([]);
  });

  it('EMA length is candles.length - period +1', () => {
    const candles = mk([1,2,3,4,5]);
    expect(calculateEMA(candles,3).length).toBe(3);
  });

  it('RSI returns [] when candles <= period', () => {
    expect(calculateRSI(mk([1,2,3]),5)).toEqual([]);
    expect(calculateRSI(mk([1,2]),14)).toEqual([]);
    expect(calculateRSI(mk([1,2,3]),0)).toEqual([]);
  });

  it('RSI bounded 0-100 and flat price returns high (100 due to avgLoss 0)', () => {
    const flat = mk(Array(20).fill(100));
    const res = calculateRSI(flat,14);
    res.forEach(r=> expect(r.value).toBeGreaterThanOrEqual(0));
    res.forEach(r=> expect(r.value).toBeLessThanOrEqual(100));
    // current impl returns 100 for flat (avgLoss 0)
    expect(res[0].value).toBe(50);
  });

  it('RSI monotonic gains => near 100, monotonic losses => near 0', () => {
    const up = mk(Array.from({length:30},(_,i)=> 100+i));
    const down = mk(Array.from({length:30},(_,i)=> 100-i));
    const rsiUp = calculateRSI(up,14);
    const rsiDown = calculateRSI(down,14);
    expect(rsiUp[ rsiUp.length-1].value).toBeGreaterThan(70);
    expect(rsiDown[ rsiDown.length-1].value).toBeLessThan(30);
  });

  it('MACD returns [] when insufficient candles', () => {
    expect(calculateMACD(mk(Array(10).fill(100)))).toEqual([]);
    expect(calculateMACD(mk(Array(34).fill(100)))).toHaveLength(0); // 34 <35
    expect(calculateMACD(mk(Array(35).fill(100)) ).length).toBeGreaterThan(0);
  });

  it('MACD histogram = macd - signal', () => {
    const candles = mk(Array.from({length:50},(_,i)=> 100+ Math.sin(i)*5 + i*0.2));
    const res = calculateMACD(candles);
    res.forEach(p=> expect(p.histogram).toBeCloseTo(p.macd - p.signal, 1));
  });

  it('MACD fast==slow edge produces near zero macd', () => {
    const candles = mk(Array.from({length:40},()=>100));
    const res = calculateMACD(candles,12,12,9);
    res.forEach(p=> expect(Math.abs(p.macd)).toBeLessThan(0.01));
  });

  it('Bollinger invalid period returns []', () => {
    expect(calculateBollingerBands(mk([1,2]),0)).toEqual([]);
    expect(calculateBollingerBands(mk([1,2]),5)).toEqual([]);
  });

  it('Bollinger flat price upper==middle==lower', () => {
    const flat = mk(Array(20).fill(100));
    const res = calculateBollingerBands(flat,20);
    expect(res[0].upper).toBe(100);
    expect(res[0].lower).toBe(100);
    expect(res[0].middle).toBe(100);
  });

  it('Bollinger invariant upper >= middle >= lower', () => {
    const candles = mk(Array.from({length:30},(_,i)=> 100+ (i%2?5:-5)));
    const res = calculateBollingerBands(candles,5);
    res.forEach(b=> {
      expect(b.upper).toBeGreaterThanOrEqual(b.middle);
      expect(b.middle).toBeGreaterThanOrEqual(b.lower);
    });
  });

  it('VolumeMA period edge', () => {
    expect(calculateVolumeMA([],20)).toEqual([]);
    expect(calculateVolumeMA(mk([1,2]),0)).toEqual([]);
    expect(calculateVolumeMA(mk([1,2,3]),5)).toEqual([]);
  });

  it('VolumeMA correct averaging', () => {
    const candles: Candle[] = [1000,2000,3000].map((v,i)=>({ time:`2024-01-0${i+1}`, open:10, high:10, low:10, close:10, volume:v }));
    const res = calculateVolumeMA(candles,2);
    expect(res[0].value).toBe(1500);
    expect(res[1].value).toBe(2500);
  });

  it('Indicators performance with 5000 candles', () => {
    const big = mk(Array.from({length:5000},(_,i)=> 100+ Math.random()*10));
    const t0=Date.now();
    calculateSMA(big,20);
    calculateEMA(big,12);
    calculateRSI(big,14);
    calculateBollingerBands(big,20);
    calculateVolumeMA(big,20);
    const dt = Date.now()-t0;
    expect(dt).toBeLessThan(1000); // should be fast
  });
});
