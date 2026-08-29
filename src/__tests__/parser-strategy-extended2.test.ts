import { describe, it, expect } from 'vitest';
import { tokenize, parseRuleToAST, validateRule, compileRule } from '../parser/strategy-dsl';
import { SAMPLE_STRATEGIES } from '../parser/sample-strategies';

const ctx: any = { index: 5, candle: { close: 100, open: 99, high: 101, low: 98, volume: 1000 }, candles: Array.from({ length: 10 }, () => ({ close: 100, open: 99, high: 101, low: 98, volume: 1000 })), indicators: { sma20: Array(10).fill(100), sma50: Array(10).fill(100), sma200: Array(10).fill(100), ema12: Array(10).fill(100), ema26: Array(10).fill(100), rsi14: Array(10).fill(50), macd: Array(10).fill({ macd: 0, signal: 0, histogram: 0 }), bb: Array(10).fill({ upper: 110, middle: 100, lower: 90 }), volumeMA20: Array(10).fill(1000) } };

describe('Parser Strategy Extended2', () => {
  it('tokenize identifiers', () => {
    expect(tokenize('SMA(20)').some(t => t.type === 'IDENTIFIER')).toBe(true);
  });

  it('tokenize numbers', () => {
    expect(tokenize('100').some(t => t.type === 'NUMBER')).toBe(true);
  });

  it('validate all sample strategies', () => {
    SAMPLE_STRATEGIES.forEach(s => {
      expect(validateRule(s.entryRule).valid).toBe(true);
      expect(validateRule(s.exitRule).valid).toBe(true);
    });
  });

  it('compile golden cross', () => {
    expect(typeof compileRule('crosses_above(SMA(50), SMA(200))')).toBe('function');
  });

  it('compile RSI', () => {
    const fn = compileRule('RSI() > 70');
    ctx.indicators.rsi14[5] = 80;
    expect(fn(ctx)).toBe(true);
  });

  it('compile price', () => {
    const fn = compileRule('PRICE > 90');
    expect(fn(ctx)).toBe(true);
  });

  it('compile volume', () => {
    expect(validateRule('VOLUME > 1000000').valid).toBe(true);
  });

  it('AND OR', () => {
    const fn = compileRule('CLOSE > 90 AND CLOSE < 110');
    expect(fn(ctx)).toBe(true);
  });

  it('NOT', () => {
    const fn = compileRule('NOT CLOSE > 200');
    expect(fn(ctx)).toBe(true);
  });

  it('parentheses', () => {
    expect(validateRule('(CLOSE > 100 AND RSI() < 30) OR SMA(20) > 50').valid).toBe(true);
  });

  it('invalid rule missing paren', () => {
    expect(validateRule('SMA(20 > 100').valid).toBe(false);
  });

  it('invalid empty', () => {
    expect(validateRule('').valid).toBe(false);
  });

  it('SMA param 200', () => {
    expect(validateRule('SMA(200) > 100').valid).toBe(true);
  });

  it('EMA', () => {
    expect(validateRule('EMA(12) > 100').valid).toBe(true);
  });

  it('BB upper lower', () => {
    expect(validateRule('PRICE > BB_UPPER()').valid).toBe(true);
    expect(validateRule('PRICE < BB_LOWER()').valid).toBe(true);
  });

  it('MACD', () => {
    expect(validateRule('MACD() > MACD_SIGNAL()').valid).toBe(true);
  });

  it('crosses below', () => {
    expect(typeof compileRule('crosses_below(SMA(50), SMA(200))')).toBe('function');
  });

  it('tokenize handles comma', () => {
    expect(tokenize('crosses_above(A, B)').some(t => t.type === 'COMMA')).toBe(true);
  });

  it('parse handles equality', () => {
    expect(validateRule('CLOSE = 100').valid).toBe(true);
  });

  it('parse handles !=', () => {
    expect(validateRule('CLOSE != 100').valid).toBe(true);
  });

  it('high low', () => {
    expect(validateRule('HIGH > LOW').valid).toBe(true);
  });

  it('sample strategies count 4', () => {
    expect(SAMPLE_STRATEGIES.length).toBe(4);
  });

  it('sample strategies have stopLoss', () => {
    expect(SAMPLE_STRATEGIES.every(s => typeof s.defaultStopLoss === 'number')).toBe(true);
  });

  it('Bollinger bounce entry', () => {
    const fn = compileRule('PRICE < BB_LOWER()');
    ctx.indicators.bb[5].lower = 110;
    expect(fn(ctx)).toBe(true);
  });

  it('rsi mean reversion', () => {
    const fn = compileRule('RSI() < 30');
    ctx.indicators.rsi14[5] = 20;
    expect(fn(ctx)).toBe(true);
  });
});
