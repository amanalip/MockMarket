import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TradingEngine } from '../engine/trading/trading-engine';
import { runBacktest } from '../engine/backtester/backtester';
import { compileRule } from '../parser/strategy-dsl';
import { Candle } from '../model/types';

const mk = (n: number, price = 100): Candle[] => Array.from({ length: n }, (_, i) => {
  const d = new Date('2020-01-01'); d.setDate(d.getDate() + i);
  const p = price + Math.sin(i) * 2;
  return { time: d.toISOString().split('T')[0], open: p, high: p + 2, low: p - 2, close: p, volume: 1000 };
});

describe('Integration E2E Extended', () => {
  it('backtester with stopLoss and takeProfit both', () => {
    const candles: Candle[] = Array.from({ length: 30 }, (_, i) => ({ time: `2020-01-${String(i + 1).padStart(2, '0')}`, open: 100, high: 120, low: 80, close: 100, volume: 1000 }));
    candles[10].low = 70; // stop hit
    candles[15].high = 130; // take hit
    const res = runBacktest(candles, candles, { ticker: 'AAPL', startDate: candles[0].time, endDate: candles[29].time, initialCash: 10000, positionSizePercent: 100, entryRule: 'CLOSE > 0', exitRule: 'CLOSE < 0', stopLossPercent: 10, takeProfitPercent: 10 }, () => true, () => false);
    expect(res.equityCurve.length).toBe(30);
  });

  it('trading engine revalue after fill', () => {
    const e = new TradingEngine(10000);
    const c: Candle = { time: '2024-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 };
    e.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-01' }, c);
    e.updatePrices({ AAPL: 150 });
    expect(e.getState().positions['AAPL'].unrealizedPnL).toBe(500);
  });

  it('order fill price uses open vs limit', () => {
    const e = new TradingEngine(10000);
    const c: Candle = { time: '2024-01-01', open: 95, high: 110, low: 90, close: 100, volume: 1000 };
    e.placeOrder({ ticker: 'AAPL', side: 'buy', type: 'limit', shares: 10, limitPrice: 100, date: '2024-01-01' }, c);
    const order = e.getState().orders[0];
    expect(order.status).toBe('filled');
    expect(order.filledPrice).toBe(95); // min(limit, open)
  });

  it('compileRule complex AND OR', () => {
    const fn = compileRule('CLOSE > 100 AND RSI() < 70 OR CLOSE < 50');
    expect(typeof fn).toBe('function');
  });

  it('backtester positionSize 50% leaves cash', () => {
    const candles = mk(20);
    const res = runBacktest(candles, candles, { ticker: 'AAPL', startDate: candles[0].time, endDate: candles[19].time, initialCash: 10000, positionSizePercent: 50, entryRule: 'CLOSE > 0', exitRule: 'CLOSE < 0' }, () => true, () => false);
    expect(res.equityCurve[0].strategyValue).toBe(10000);
  });

  it('trading engine cancel pending', () => {
    const e = new TradingEngine(10000);
    const c: Candle = { time: '2024-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 };
    const order = e.placeOrder({ ticker: 'AAPL', side: 'buy', type: 'limit', shares: 10, limitPrice: 50, date: '2024-01-01' }, { ...c, low: 60 } as Candle);
    expect(order.filled).toBe(false);
    expect(e.cancelOrder(order.orderId!)).toBe(true);
  });

  it('trading engine case insensitive ticker', () => {
    const e = new TradingEngine(10000);
    const c: Candle = { time: '2024-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 };
    e.executeMarketOrder({ ticker: 'aapl', side: 'buy', type: 'market', shares: 10, date: '2024-01-01' }, c);
    expect(e.getState().positions['aapl']).toBeDefined();
  });

  it('backtester filtered candles 5 minimum', () => {
    const candles = mk(4);
    expect(() => runBacktest(candles, candles, { ticker: 'AAPL', startDate: candles[0].time, endDate: candles[3].time, initialCash: 10000, positionSizePercent: 100, entryRule: 'CLOSE > 0', exitRule: 'CLOSE < 0' }, () => true, () => false)).toThrow();
  });

  it('trading engine getTotalPortfolioValue after multiple buys', () => {
    const e = new TradingEngine(10000);
    const c: Candle = { time: '2024-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 };
    e.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 5, date: '2024-01-01' }, c);
    e.executeMarketOrder({ ticker: 'MSFT', side: 'buy', type: 'market', shares: 5, date: '2024-01-01' }, { ...c, close: 200 });
    expect(e.getTotalPortfolioValue()).toBe(10000);
  });

  it('compileRule crosses handles index 0', () => {
    const fn = compileRule('crosses_above(CLOSE, SMA(20))');
    const ctx: any = { index: 0, candle: { close: 100 }, candles: [{ close: 100 }], indicators: { sma20: [100], sma50: [100], sma200: [100], ema12: [100], ema26: [100], rsi14: [50], macd: [{ macd: 0, signal: 0, histogram: 0 }], bb: [{ upper: 110, middle: 100, lower: 90 }], volumeMA20: [1000] } };
    expect(fn(ctx)).toBe(false);
  });

  it('trading engine sell without position fails', () => {
    const e = new TradingEngine(10000);
    const c: Candle = { time: '2024-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 };
    expect(e.executeMarketOrder({ ticker: 'AAPL', side: 'sell', type: 'market', shares: 10, date: '2024-01-01' }, c).success).toBe(false);
  });

  it('backtester benchmark missing handled', () => {
    const candles = mk(10);
    const res = runBacktest(candles, [], { ticker: 'AAPL', startDate: candles[0].time, endDate: candles[9].time, initialCash: 10000, positionSizePercent: 100, entryRule: 'CLOSE > 0', exitRule: 'CLOSE < 0' }, () => true, () => false);
    expect(res.equityCurve[0].benchmarkValue).toBe(10000);
  });

  it('trading engine limit sell high check', () => {
    const e = new TradingEngine(10000);
    const c: Candle = { time: '2024-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 };
    e.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-01' }, c);
    const order = e.placeOrder({ ticker: 'AAPL', side: 'sell', type: 'limit', shares: 5, limitPrice: 200, date: '2024-01-01' }, { ...c, high: 150 } as Candle);
    expect(order.filled).toBe(false);
  });

  it('compileRule handles NOT', () => {
    const fn = compileRule('NOT CLOSE > 100');
    expect(typeof fn).toBe('function');
  });

  it('trading engine updatePrices ignores unknown', () => {
    const e = new TradingEngine(10000);
    e.updatePrices({ UNKNOWN: 100 });
    expect(e.getState().positions['UNKNOWN']).toBeUndefined();
  });

  it('backtester handles entry never true', () => {
    const candles = mk(20);
    const res = runBacktest(candles, candles, { ticker: 'AAPL', startDate: candles[0].time, endDate: candles[19].time, initialCash: 10000, positionSizePercent: 100, entryRule: 'CLOSE > 1000', exitRule: 'CLOSE < 0' }, () => false, () => false);
    expect(res.trades.length).toBe(0);
  });

  it('trading engine commission affects cash', () => {
    const e = new TradingEngine(10000, 10);
    const c: Candle = { time: '2024-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 };
    e.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-01' }, c);
    expect(e.getState().cash).toBe(8990);
  });

  it('compileRule validates empty', () => {
    expect(compileRule('')).toString().includes('=>') || expect(typeof compileRule('')).toBe('function');
  });

  it('backtester equity curve sorted by date', () => {
    const candles = mk(10);
    const res = runBacktest(candles, candles, { ticker: 'AAPL', startDate: candles[0].time, endDate: candles[9].time, initialCash: 10000, positionSizePercent: 100, entryRule: 'CLOSE > 0', exitRule: 'CLOSE < 0' }, () => true, () => false);
    const dates = res.equityCurve.map(c => c.date);
    expect(dates).toEqual([...dates].sort());
  });

  it('trading engine processPendingOrders case insensitive', () => {
    const e = new TradingEngine(10000);
    const c: Candle = { time: '2024-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 };
    e.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-01' }, c);
    e.placeOrder({ ticker: 'AAPL', side: 'sell', type: 'limit', shares: 5, limitPrice: 150, date: '2024-01-01' }, { ...c, high: 140 } as Candle);
    const filled = e.processPendingOrders({ ...c, high: 160 } as Candle, 'aapl');
    expect(filled.length).toBe(1);
  });
});
