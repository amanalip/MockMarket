import { describe, it, expect } from 'vitest';
import { TradingEngine } from '../engine/trading/trading-engine';
import { calculatePositionUpdate } from '../engine/trading/portfolio';
import { normalizeWeights, simulateETF } from '../engine/etf/etf-builder';
import { Candle } from '../model/types';

const candle = (time: string, price: number, opts: Partial<Candle> = {}): Candle => ({
  time, open: price, high: price + 2, low: price - 2, close: price, volume: 1_000_000, ...opts,
});

describe('Bugfix Batch 2 – Trading & ETF hardening', () => {
  it('sell reservation is case-insensitive and prevents over-sell', () => {
    const eng = new TradingEngine(100000, 0);
    const c = candle('2024-01-02', 100);
    // buy 10 AAPL
    const r = eng.executeMarketOrder({ ticker: 'AAPL', side: 'buy', shares: 10, type: 'market', date: c.time }, c);
    expect(r.success).toBe(true);
    // place sell limit with lowercase ticker
    const r1 = eng.placeOrder({ ticker: 'aapl', side: 'sell', type: 'limit', shares: 6, limitPrice: 110, date: c.time }, c);
    expect(r1.success).toBe(true);
    // second sell with uppercase should be blocked due to pending 6 + request 5 > owned 10
    const r2 = eng.placeOrder({ ticker: 'AAPL', side: 'sell', type: 'limit', shares: 5, limitPrice: 110, date: c.time }, c);
    expect(r2.success).toBe(false);
    expect(r2.error).toMatch(/Insufficient available shares/);
  });

  it('stop_loss and take_profit respect side', () => {
    const eng = new TradingEngine(100000, 0);
    const cBuy = candle('2024-01-01', 100);
    eng.executeMarketOrder({ ticker: 'AAPL', side: 'buy', shares: 10, type: 'market', date: cBuy.time }, cBuy);
    // Buy stop_loss should NOT fill on low dip (only triggers on high >= stop)
    const buyStop = eng.placeOrder({ ticker: 'AAPL', side: 'buy', type: 'stop_loss', shares: 5, stopPrice: 90, date: cBuy.time }, undefined);
    expect(buyStop.success).toBe(true);
    const buyOrderId = buyStop.orderId!;
    // candle where low 80 (would trigger sell stop) but high 85 < 90 (so buy stop should stay pending)
    const triggerCandleLow = { time: '2024-01-02', open: 80, high: 85, low: 70, close: 82, volume: 1_000_000 };
    eng.processPendingOrders(triggerCandleLow as Candle, 'AAPL');
    const stateAfter = eng.getState();
    const buyOrder = stateAfter.orders.find(o => o.id === buyOrderId)!;
    expect(buyOrder.status).toBe('pending'); // buy stop_loss should remain pending on low-only candle
    // Now sell stop_loss should fill on same low candle
    const sellStop = eng.placeOrder({ ticker: 'AAPL', side: 'sell', type: 'stop_loss', shares: 5, stopPrice: 90, date: cBuy.time }, undefined);
    expect(sellStop.success).toBe(true);
    eng.processPendingOrders(triggerCandleLow as Candle, 'AAPL');
    const stateAfter2 = eng.getState();
    const sellOrder = stateAfter2.orders.find(o => o.id === sellStop.orderId)!;
    expect(sellOrder.status).toBe('filled');
  });

  it('portfolio buy totalCost includes fee', () => {
    const { updatedPosition } = calculatePositionUpdate(undefined, 'buy', 10, 10, 5);
    expect(updatedPosition!.totalCost).toBe(105);
    expect(updatedPosition!.avgCost).toBe(10.5);
    expect(updatedPosition!.unrealizedPnL).toBe(-5); // currentValue 100 - totalCost 105 = -5
  });

  it('normalizeWeights distributes rounding drift evenly for large N', () => {
    const tickers = Array.from({ length: 500 }, (_, i) => ({ ticker: `T${i}`, targetWeight: 0 }));
    const result = normalizeWeights(tickers);
    const sum = result.reduce((s, t) => s + t.targetWeight, 0);
    expect(sum).toBeCloseTo(100, 2);
    const max = Math.max(...result.map(r => r.targetWeight));
    const min = Math.min(...result.map(r => r.targetWeight));
    expect(max - min).toBeLessThan(0.02); // previously last was 1.33 vs 0.33 diff 1.0
    // also check 100 tickers case
    const tickers100 = Array.from({ length: 100 }, (_, i) => ({ ticker: `T${i}`, targetWeight: 0 }));
    const res100 = normalizeWeights(tickers100);
    const max100 = Math.max(...res100.map(r => r.targetWeight));
    const min100 = Math.min(...res100.map(r => r.targetWeight));
    expect(max100 - min100).toBeLessThan(0.02);
  });

  it('ETF simulate handles prevPrice 0 without stuck NAV or NaN', () => {
    // requires >=5 common dates, so use 5 days where first date AAA has 0 price
    const etfConfig: any = { id: 'test', name: 'Test', tickers: [{ ticker: 'AAA', targetWeight: 50 }, { ticker: 'BBB', targetWeight: 50 }], rebalanceFrequency: 'never' };
    const mk = (start: string, prices: number[]): Candle[] => prices.map((p, i) => {
      const d = new Date(start); d.setDate(d.getDate() + i);
      return candle(d.toISOString().split('T')[0], p);
    });
    const candlesA: Candle[] = mk('2024-01-01', [0, 100, 102, 103, 104]);
    const candlesB: Candle[] = mk('2024-01-01', [100, 110, 112, 113, 114]);
    const map: Record<string, Candle[]> = { AAA: candlesA, BBB: candlesB };
    const res = simulateETF(etfConfig, map);
    expect(res.navHistory.length).toBe(5);
    res.navHistory.forEach(pt => {
      expect(Number.isFinite(pt.nav)).toBe(true);
      expect(Number.isNaN(pt.nav)).toBe(false);
    });
    // NAV should evolve based on BBB at least, not stay NaN
    expect(res.navHistory[4].nav).toBeGreaterThan(90);
  });
});
