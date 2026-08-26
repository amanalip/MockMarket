import { describe, it, expect } from 'vitest';
import {
  tokenize,
  parseRuleToAST,
  compileRule,
  validateRule,
} from '../parser/strategy-dsl';
import { SAMPLE_STRATEGIES } from '../parser/sample-strategies';
import { BarRuleContext } from '../engine/backtester/backtester';
import { Candle } from '../model/types';

describe('Strategy DSL Parser & Compiler', () => {
  const dummyCandle: Candle = {
    time: '2024-01-02',
    open: 100,
    high: 105,
    low: 95,
    close: 100,
    volume: 1000,
  };

  const dummyContext: BarRuleContext = {
    index: 1,
    candle: dummyCandle,
    candles: [
      { ...dummyCandle, time: '2024-01-01', close: 90 },
      dummyCandle,
    ],
    indicators: {
      sma20: [90, 100],
      sma50: [95, 105],
      sma200: [100, 102],
      ema12: [92, 98],
      ema26: [95, 96],
      rsi14: [25, 75],
      macd: [{ macd: 1, signal: 2, histogram: -1 }, { macd: 3, signal: 2, histogram: 1 }],
      bb: [{ upper: 110, middle: 100, lower: 90 }, { upper: 110, middle: 100, lower: 90 }],
      volumeMA20: [1000, 1000],
    },
    inPosition: false,
  };

  it('tokenizes identifiers, numbers, operators, and functions', () => {
    const tokens = tokenize('crosses_above(SMA(50), SMA(200)) AND RSI() < 30');
    expect(tokens.length).toBeGreaterThan(5);
    expect(tokens[0].value).toBe('CROSSES_ABOVE');
    expect(tokens.some((t) => t.value === 'AND')).toBe(true);
    expect(tokens.some((t) => t.value === '<')).toBe(true);
  });

  it('parses all bundled sample strategies into valid AST structures', () => {
    SAMPLE_STRATEGIES.forEach((strategy) => {
      const entryValidation = validateRule(strategy.entryRule);
      expect(entryValidation.valid, `Entry rule error for ${strategy.name}: ${entryValidation.error}`).toBe(true);

      const exitValidation = validateRule(strategy.exitRule);
      expect(exitValidation.valid, `Exit rule error for ${strategy.name}: ${exitValidation.error}`).toBe(true);

      const astEntry = parseRuleToAST(strategy.entryRule);
      expect(astEntry).toBeDefined();
    });
  });

  it('evaluates RSI conditions accurately', () => {
    const rsiLowRule = compileRule('RSI() < 30');
    const rsiHighRule = compileRule('RSI() > 70');

    // In dummy context at index 1: rsi14 is 75
    expect(rsiLowRule(dummyContext)).toBe(false);
    expect(rsiHighRule(dummyContext)).toBe(true);
  });

  it('evaluates crosses_above and crosses_below accurately', () => {
    // In dummy context:
    // Index 0: macd=1, signal=2 (macd <= signal)
    // Index 1: macd=3, signal=2 (macd > signal) -> crosses_above is TRUE
    const crossAboveRule = compileRule('crosses_above(MACD(), MACD_SIGNAL())');
    expect(crossAboveRule(dummyContext)).toBe(true);

    const crossBelowRule = compileRule('crosses_below(MACD(), MACD_SIGNAL())');
    expect(crossBelowRule(dummyContext)).toBe(false);
  });

  it('evaluates compound boolean logic with AND, OR, and NOT', () => {
    const compoundRule = compileRule('RSI() > 70 AND (PRICE >= 100 OR NOT SMA(50) < 50)');
    expect(compoundRule(dummyContext)).toBe(true);
  });

  it('returns validation errors for malformed syntax', () => {
    const res1 = validateRule('crosses_above(SMA(50)');
    expect(res1.valid).toBe(false);

    const res2 = validateRule('PRICE > > 100');
    expect(res2.valid).toBe(false);
  });
});
