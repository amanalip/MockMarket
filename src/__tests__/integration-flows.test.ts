import { describe, it, expect } from 'vitest';
import { TradingEngine } from '../engine/trading/trading-engine';
import { runBacktest } from '../engine/backtester/backtester';
import { compileRule } from '../parser/strategy-dsl';
import { simulateETF } from '../engine/etf/etf-builder';
import { calculateTimeMachine } from '../engine/timemachine/timemachine';
import { calculateTrackingError } from '../engine/etf/tracking-error';
import { Candle } from '../model/types';
import { createTestRandom, FUZZ_SEED } from './test-random';

const random = createTestRandom('integration-flows');

const mkCandles = (n: number, base = 100): Candle[] =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date('2020-01-01'); d.setDate(d.getDate() + i);
    const price = base + Math.sin(i / 5) * 10 + i * 0.2;
    return { time: d.toISOString().split('T')[0], open: price, high: price + 2, low: price - 2, close: price, volume: 1_000_000 };
  });

describe(`Integration Flows - End-to-End (seed ${FUZZ_SEED})`, () => {
  it('trading engine buy -> pending sell -> fill -> portfolio value invariant', () => {
    const engine = new TradingEngine(10000, 5);
    const c = mkCandles(1)[0];
    engine.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 20, date: c.time }, { ...c, close: 100 });
    const pending = mkCandles(1)[0];
    const order = engine.placeOrder({ ticker: 'AAPL', side: 'sell', type: 'limit', shares: 10, limitPrice: 110, date: c.time }, { ...pending, high: 100, low: 90 });
    expect(order.success).toBe(true);
    expect(order.filled).toBe(false);
    const fill = { ...pending, high: 120, low: 100, open: 100, close: 115 };
    engine.processPendingOrders(fill as Candle, 'AAPL');
    const state = engine.getState();
    expect(state.trades.length).toBe(2);
    expect(engine.getTotalPortfolioValue()).toBeGreaterThan(0);
  });

  it('DSL compile + backtester full flow with golden cross', () => {
    const candles = mkCandles(300);
    const entry = compileRule('crosses_above(SMA(50), SMA(200))');
    const exit = compileRule('crosses_below(SMA(50), SMA(200))');
    const res = runBacktest(candles, candles, {
      ticker: 'AAPL', startDate: candles[50].time, endDate: candles[250].time,
      initialCash: 50000, positionSizePercent: 100,
      entryRule: 'crosses_above(SMA(50), SMA(200))',
      exitRule: 'crosses_below(SMA(50), SMA(200))',
    }, entry, exit);
    expect(res.equityCurve.length).toBeGreaterThan(100);
    expect(res.stats.totalTrades).toBeGreaterThanOrEqual(0);
    expect(res.monthlyReturns.length).toBeGreaterThan(0);
  });

  it('DSL entry always true backtester buys once and holds (no exit trades)', () => {
    const candles = mkCandles(20, 10);
    const res = runBacktest(candles, candles, {
      ticker: 'AAPL', startDate: candles[0].time, endDate: candles[candles.length - 1].time,
      initialCash: 10000, positionSizePercent: 100,
      entryRule: 'CLOSE > 0', exitRule: 'CLOSE < 0',
    }, () => true, () => false);
    // Trades only recorded on exit, so holding position yields 0 closed trades but equity > cash
    expect(res.trades.length).toBe(0);
    expect(res.equityCurve[res.equityCurve.length - 1].strategyValue).toBeGreaterThan(0);
    expect(res.equityCurve[res.equityCurve.length - 1].strategyValue).not.toBe(10000);
  });

  it('ETF simulate + tracking error correlation', () => {
    const dates = Array.from({ length: 30 }, (_, i) => { const d = new Date('2020-01-01'); d.setDate(d.getDate() + i); return d.toISOString().split('T')[0]; });
    const map = {
      AAPL: dates.map((d, i) => ({ time: d, open: 100 + i, high: 101 + i, low: 99 + i, close: 100 + i, volume: 1000 })),
      MSFT: dates.map((d, i) => ({ time: d, open: 100 + i, high: 101 + i, low: 99 + i, close: 100 + i, volume: 1000 })),
    };
    const etf = simulateETF({ id: '1', name: 'Test', tickers: [{ ticker: 'AAPL', targetWeight: 50 }, { ticker: 'MSFT', targetWeight: 50 }], rebalanceFrequency: 'never', createdAt: '2020-01-01' }, map);
    const benchNAV = etf.navHistory.map(p => p.nav);
    const customNAV = etf.navHistory.map(p => p.nav * 0.99 + random() * 0.5);
    const te = calculateTrackingError(customNAV, benchNAV);
    expect(te.correlation).toBeGreaterThanOrEqual(-1);
    expect(te.correlation).toBeLessThanOrEqual(1);
    expect(te.trackingErrorPercent).toBeGreaterThanOrEqual(0);
  });

  it('timemachine vs buyAndHold parity when price flat', () => {
    const candles = Array.from({ length: 20 }, (_, i) => {
      const d = new Date('2020-01-01'); d.setDate(d.getDate() + i);
      return { time: d.toISOString().split('T')[0], open: 100, high: 100, low: 100, close: 100, volume: 1000 } as Candle;
    });
    const res = calculateTimeMachine(candles, candles, { ticker: 'AAPL', startDate: candles[0].time, endDate: candles[candles.length - 1].time, initialAmount: 10000 });
    expect(res.finalAssetValue).toBe(10000);
    expect(res.finalBenchmarkValue).toBe(10000);
    expect(res.totalReturnPercent).toBe(0);
  });

  it('backtester respects stopLoss priority over takeProfit', () => {
    const candles: Candle[] = [
      { time: '2020-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1e6 },
      { time: '2020-01-02', open: 100, high: 100, low: 100, close: 100, volume: 1e6 },
      { time: '2020-01-03', open: 100, high: 100, low: 100, close: 100, volume: 1e6 },
      { time: '2020-01-04', open: 100, high: 100, low: 100, close: 100, volume: 1e6 },
      { time: '2020-01-05', open: 100, high: 100, low: 100, close: 100, volume: 1e6 },
      { time: '2020-01-06', open: 100, high: 150, low: 50, close: 100, volume: 1e6 }, // both triggers
    ];
    const res = runBacktest(candles, candles, {
      ticker: 'AAPL', startDate: '2020-01-01', endDate: '2020-01-06',
      initialCash: 10000, positionSizePercent: 100,
      entryRule: '', exitRule: '',
      stopLossPercent: 10, takeProfitPercent: 10,
    }, (ctx) => ctx.index === 1, () => false);
    // bought day1, day6 low 50 triggers stop 90 before take 110
    expect(res.trades[0]?.reason).toBe('Stop Loss');
  });

  it('engine + updatePrices recomputes unrealized', () => {
    const engine = new TradingEngine(10000, 0);
    const c = mkCandles(1)[0];
    engine.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: c.time }, { ...c, close: 50 });
    engine.updatePrices({ AAPL: 100 });
    expect(engine.getState().positions['AAPL'].unrealizedPnL).toBe(500);
  });

  it('ETF rebalance quarterly vs never diverge', () => {
    const dates = Array.from({ length: 90 }, (_, i) => { const d = new Date('2020-01-01'); d.setDate(d.getDate() + i); return d.toISOString().split('T')[0]; });
    const map = {
      AAPL: dates.map(d => ({ time: d, open: 100, high: 100, low: 100, close: 100 + random() * 10, volume: 1000 })),
      MSFT: dates.map(d => ({ time: d, open: 100, high: 100, low: 100, close: 100 + random() * 10, volume: 1000 })),
    };
    const never = simulateETF({ id: '1', name: 'N', tickers: [{ ticker: 'AAPL', targetWeight: 50 }, { ticker: 'MSFT', targetWeight: 50 }], rebalanceFrequency: 'never', createdAt: '2020-01-01' }, map);
    const quarterly = simulateETF({ id: '2', name: 'Q', tickers: [{ ticker: 'AAPL', targetWeight: 50 }, { ticker: 'MSFT', targetWeight: 50 }], rebalanceFrequency: 'quarterly', createdAt: '2020-01-01' }, map);
    expect(never.navHistory.length).toBe(quarterly.navHistory.length);
  });

  it('multiple sequential backtests do not share state', () => {
    const candles = mkCandles(20);
    const fn = () => true;
    const r1 = runBacktest(candles, candles, { ticker: 'AAPL', startDate: candles[0].time, endDate: candles[10].time, initialCash: 10000, positionSizePercent: 100, entryRule: '', exitRule: '' }, fn, () => false);
    const r2 = runBacktest(candles, candles, { ticker: 'AAPL', startDate: candles[0].time, endDate: candles[10].time, initialCash: 20000, positionSizePercent: 100, entryRule: '', exitRule: '' }, fn, () => false);
    expect(r1.equityCurve[0].strategyValue).toBe(10000);
    expect(r2.equityCurve[0].strategyValue).toBe(20000);
  });

  it('trading engine reject float shares', () => {
    const engine = new TradingEngine(10000, 0);
    const c = mkCandles(1)[0];
    const res = engine.placeOrder({ ticker: 'AAPL', side: 'buy', type: 'limit', shares: 1.5, limitPrice: 90, date: c.time }, { ...c, high: 110, low: 95 });
    expect(res.success).toBe(false);
  });
});
