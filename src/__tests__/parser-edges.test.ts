import { describe, it, expect } from 'vitest';
import { tokenize, parseRuleToAST, compileRule, validateRule } from '../parser/strategy-dsl';
import { BarRuleContext } from '../engine/backtester/backtester';

const mkCtx = (over: Partial<BarRuleContext> = {}): BarRuleContext => ({
  index: 5,
  candle: { time:'2020-01-06', open:100, high:110, low:90, close:105, volume:1000 },
  candles: Array.from({length:10},(_,i)=>({ time:`2020-01-0${i+1}`, open:100+i, high:105+i, low:95+i, close:100+i, volume:1000 })),
  indicators: {
    sma20: Array(10).fill(100),
    sma50: Array(10).fill(100),
    sma200: Array(10).fill(100),
    ema12: Array(10).fill(100),
    ema26: Array(10).fill(100),
    rsi14: Array(10).fill(50),
    macd: Array(10).fill({macd:0,signal:0,histogram:0}),
    bb: Array(10).fill({upper:110,middle:100,lower:90}),
    volumeMA20: Array(10).fill(1000),
  },
  inPosition:false,
  ...over,
});

describe('Strategy DSL - Edges & Bugs', () => {
  it('tokenizes numbers, identifiers, operators', () => {
    expect(tokenize('SMA(50) > 100').map(t=>t.type)).toContain('IDENTIFIER');
    expect(tokenize('10.5 >= 2').map(t=>t.value)).toContain('>=');
    expect(tokenize('1 AND 2 OR 3').filter(t=>t.type==='LOGICAL').length).toBe(2);
  });

  it('tokenize invalid char throws', () => {
    expect(()=> tokenize('SMA($)')).toThrow(/Unexpected character/);
  });

  it('tokenize handles numbers starting with dot', () => {
    const toks=tokenize('.5 > 1');
    expect(toks[0].value).toBe('.5');
  });

  it('tokenize double dot is single number token (bug case)', () => {
    // current impl collects 1..2 as single number; parseFloat =>1
    const toks=tokenize('1..2');
    expect(toks[0].type).toBe('NUMBER');
    expect(parseFloat(toks[0].value)).toBe(1);
  });

  it('parse NOT precedence - NOT binds only next comparison (bug)', () => {
    const ast=parseRuleToAST('NOT RSI(14) > 70 AND CLOSE > SMA(50)');
    expect(ast.type).toBe('LogicalOp'); // OR/AND structure
    // evaluate handles NOT A AND B => (!A) AND B due to parseNot->parseComparison
    const fn=compileRule('NOT RSI(14) > 70');
    const ctx=mkCtx({ indicators:{ ...mkCtx().indicators, rsi14: Array(10).fill(80) } });
    expect(fn(ctx)).toBe(false); // 80>70 true, NOT true => false
  });

  it('compileRule empty returns false', () => {
    expect(compileRule('')(mkCtx())).toBe(false);
    expect(compileRule('   ')(mkCtx())).toBe(false);
  });

  it('validateRule detects errors', () => {
    expect(validateRule('').valid).toBe(false);
    expect(validateRule('SMA(50) >').valid).toBe(false);
    expect(validateRule('AND OR').valid).toBe(false);
    expect(validateRule('RSI(14) > 70').valid).toBe(true);
  });

  it('resolves SMA param mapping bug: SMA(10) falls back to sma20', () => {
    const ctx=mkCtx();
    ctx.indicators.sma20[5]=111;
    ctx.indicators.sma50[5]=222;
    const fn=compileRule('SMA(10) > 110');
    expect(fn(ctx)).toBe(true); // uses sma20 111 >110 true
    const fn2=compileRule('SMA(200) > 200');
    ctx.indicators.sma200[5]=250;
    expect(fn2(ctx)).toBe(true);
  });

  it('CROSSES_ABOVE needs previous bar', () => {
    const fn=compileRule('crosses_above(CLOSE, SMA(20))');
    const ctx0=mkCtx({ index:0 });
    expect(fn(ctx0)).toBe(false);
    // prev close 100 <= sma 100, curr 101 >100 => true
    const ctx=mkCtx({ index:1 });
    ctx.candles[0].close=100; ctx.candles[1].close=101;
    ctx.indicators.sma20[0]=100; ctx.indicators.sma20[1]=100;
    expect(fn(ctx)).toBe(true);
  });

  it('CROSSES_BELOW symmetric', () => {
    const fn=compileRule('crosses_below(CLOSE, SMA(20))');
    const ctx=mkCtx({ index:1 });
    ctx.candles[0].close=101; ctx.candles[1].close=99;
    ctx.indicators.sma20[0]=100; ctx.indicators.sma20[1]=100;
    expect(fn(ctx)).toBe(true);
  });

  it('equality uses epsilon 0.001', () => {
    const fn=compileRule('CLOSE == 100');
    const ctx=mkCtx();
    ctx.candles[5].close=100.0005;
    expect(fn(ctx)).toBe(true);
    ctx.candles[5].close=100.01;
    expect(fn(ctx)).toBe(false);
  });

  it('handles unknown identifier as 0', () => {
    const fn=compileRule('UNKNOWN > 0');
    expect(fn(mkCtx())).toBe(false);
    const fn2=compileRule('UNKNOWN == 0');
    expect(fn2(mkCtx())).toBe(true);
  });

  it('function with wrong arg count returns false', () => {
    const fn=compileRule('crosses_above(CLOSE)');
    expect(fn(mkCtx())).toBe(false);
  });

  it('SAMPLE_STRATEGIES all parse', async () => {
    const { SAMPLE_STRATEGIES } = await import('../parser/sample-strategies');
    SAMPLE_STRATEGIES.forEach(s=> {
      expect(validateRule(s.entryRule).valid).toBe(true);
      expect(validateRule(s.exitRule).valid).toBe(true);
    });
  });

  it('nested parens and complex logic', () => {
    const fn=compileRule('(RSI(14) > 30 AND RSI(14) < 70) OR CLOSE > SMA(50)');
    const ctx=mkCtx();
    ctx.indicators.rsi14[5]=50; ctx.candles[5].close=90; ctx.indicators.sma50[5]=100;
    expect(fn(ctx)).toBe(true); // rsi 50 in range => true
    ctx.indicators.rsi14[5]=80; ctx.candles[5].close=90;
    expect(fn(ctx)).toBe(false); // rsi out, close 90<100
  });
});
