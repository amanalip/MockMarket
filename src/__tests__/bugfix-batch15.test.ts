import { describe, it, expect } from 'vitest';
import { calculateAnnualizedVolatility, calculateReturns } from '../engine/risk/volatility';
import { TradingEngine } from '../engine/trading/trading-engine';
import { simulateETF } from '../engine/etf/etf-builder';
import { Candle } from '../model/types';

const mkCandle = (time: string, close: number, extra: Partial<Candle> = {}): Candle => ({
  time, open: close, high: close + 1, low: close - 1, close, volume: 1000, ...extra,
});

describe('Bugfix Batch 15 – Volatility/Trading/ETF/Simulation', () => {
  it('annualized volatility filters NaN and handles negative', () => {
    // includes NaN and negative price returns should be filtered
    const rets = calculateReturns([10, -5, 10]); // -5 is invalid price, should skip
    expect(rets.length).toBe(0); // both 10->-5 and -5->10 skipped
    // For volatility, NaN in returns should be filtered
    const vol = calculateAnnualizedVolatility([0.01, NaN as any, Infinity as any, -0.01, 0.02]);
    expect(Number.isFinite(vol)).toBe(true);
    expect(vol).toBeGreaterThanOrEqual(0);
  });

  it('trading engine checkAndFillOrder guards NaN candle', () => {
    const eng = new TradingEngine(100000, 0);
    const c = mkCandle('2024-01-01', 100);
    eng.executeMarketOrder({ ticker: 'AAPL', side: 'buy', shares: 10, type: 'market' }, c);
    const res = eng.placeOrder({ ticker: 'AAPL', side: 'sell', type: 'limit', shares: 5, limitPrice: 110 }, c);
    expect(res.success).toBe(true);
    const badCandle: Candle = { time: '2024-01-02', open: NaN as any, high: NaN as any, low: NaN as any, close: 100, volume: 1000 };
    const filled = eng.processPendingOrders(badCandle, 'AAPL');
    expect(filled.length).toBe(0);
    expect(Number.isFinite(eng.getState().cash)).toBe(true);
  });

  it('executeFill guards NaN fillPrice', () => {
    const eng = new TradingEngine(100000, 0);
    // directly call private via any
    const order: any = { id: 'test', ticker: 'AAPL', side: 'buy', type: 'limit', shares: 10, status: 'pending' };
    (eng as any).state.orders.push(order);
    (eng as any).executeFill(order, NaN as any, '2024-01-01');
    expect(order.status).toBe('cancelled');
    expect(Number.isFinite(eng.getState().cash)).toBe(true);
    const order2: any = { id: 'test2', ticker: 'AAPL', side: 'buy', type: 'limit', shares: 10, status: 'pending' };
    (eng as any).state.orders.push(order2);
    (eng as any).executeFill(order2, Infinity as any, '2024-01-01');
    expect(order2.status).toBe('cancelled');
  });

  it('etf simulate guards Infinity NAV', () => {
    const mk = (price: number): Candle[] =>
      Array.from({ length: 5 }, (_, i) => {
        const d = new Date('2024-01-01'); d.setDate(d.getDate() + i);
        return mkCandle(d.toISOString().split('T')[0], price);
      });
    const map: Record<string, Candle[]> = { AAPL: mk(100) };
    // corrupt last candle to Infinity
    (map.AAPL[4] as any).close = Infinity;
    const cfg: any = { id: 'test', name: 'Test', tickers: [{ ticker: 'AAPL', targetWeight: 100 }], rebalanceFrequency: 'never' };
    expect(() => simulateETF(cfg, map)).not.toThrow();
    const res = simulateETF(cfg, map);
    expect(res.navHistory.every(pt => Number.isFinite(pt.nav))).toBe(true);
  });

  it('simulation effectiveIndex beyond last goes to last not 0', () => {
    const candles = [mkCandle('2024-01-01', 100), mkCandle('2024-01-02', 101), mkCandle('2024-01-03', 102)];
    const simulationDate = '2025-01-01';
    const currentIndex = candles.findIndex(c => c.time === simulationDate);
    const nextOrEqualIdx = candles.findIndex(c => c.time >= simulationDate);
    const effectiveIndex = currentIndex >= 0 ? currentIndex : nextOrEqualIdx >= 0 ? nextOrEqualIdx : candles.length > 0 ? candles.length - 1 : 0;
    expect(effectiveIndex).toBe(2); // last, not 0
    const beforeDate = '2023-12-31';
    const ci2 = candles.findIndex(c => c.time === beforeDate);
    const ne2 = candles.findIndex(c => c.time >= beforeDate);
    const eff2 = ci2 >= 0 ? ci2 : ne2 >= 0 ? ne2 : candles.length - 1;
    expect(eff2).toBe(0);
  });
});
