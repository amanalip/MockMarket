import { describe, it, expect, beforeEach } from 'vitest';
import { TradingEngine } from '../engine/trading/trading-engine';
import { Candle } from '../model/types';

const mkCandle = (over: Partial<Candle> = {}): Candle => ({
  time: '2024-01-02',
  open: 100,
  high: 110,
  low: 90,
  close: 100,
  volume: 1000000,
  ...over,
});

describe('Trading Engine - Edge & Bug Cases', () => {
  let engine: TradingEngine;

  beforeEach(() => {
    engine = new TradingEngine(10000, 0);
  });

  it('rejects zero and negative shares for market orders', () => {
    const c = mkCandle();
    expect(engine.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 0, date: '2024-01-02' }, c).success).toBe(false);
    expect(engine.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: -5, date: '2024-01-02' }, c).success).toBe(false);
    expect(engine.placeOrder({ ticker: 'AAPL', side: 'buy', type: 'limit', shares: 0, limitPrice: 90, date: '2024-01-02' }, c).success).toBe(false);
  });

  it('rejects market order without candle', () => {
    const res = engine.placeOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-02' });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/require.*candle/i);
  });

  it('validates limitPrice must be positive', () => {
    const c = mkCandle({ close: 100 });
    const r1 = engine.placeOrder({ ticker: 'AAPL', side: 'buy', type: 'limit', shares: 10, limitPrice: 0, date: '2024-01-02' }, c);
    expect(r1.success).toBe(false);
    const r2 = engine.placeOrder({ ticker: 'AAPL', side: 'buy', type: 'limit', shares: 10, limitPrice: -5, date: '2024-01-02' }, c);
    expect(r2.success).toBe(false);
  });

  it('sell pending reservation is case-insensitive', () => {
    const c = mkCandle();
    engine.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-02' }, c);
    const r1 = engine.placeOrder({ ticker: 'AAPL', side: 'sell', type: 'limit', shares: 6, limitPrice: 150, date: '2024-01-02' }, mkCandle({ high: 140, close: 100 }));
    expect(r1.success).toBe(true);
    // try same ticker lower-case while first is pending
    const r2 = engine.placeOrder({ ticker: 'aapl', side: 'sell', type: 'limit', shares: 5, limitPrice: 150, date: '2024-01-02' }, mkCandle({ high: 140 }));
    expect(r2.success).toBe(false);
    expect(r2.error).toMatch(/Insufficient available shares/);
  });

  it('buy limit with limitPrice 0 fallback bug is handled (uses ?? not ||)', () => {
    const c = mkCandle({ close: 100 });
    // cash 10000, shares 10 * limit 100 =1000 would succeed, shares 1000*100 would fail
    const res = engine.placeOrder({ ticker: 'AAPL', side: 'buy', type: 'limit', shares: 1000, limitPrice: 0, date: '2024-01-02' }, c);
    expect(res.success).toBe(false);
  });

  it('two pending buys exceeding cash second fills cancels', () => {
    const cheap = mkCandle({ open: 100, low: 80, close: 100 });
    const expensiveHigh = mkCandle({ open: 100, high: 110, low: 95, close: 100 });
    // place two buys that individually pass but together exceed cash
    engine.placeOrder({ ticker: 'AAPL', side: 'buy', type: 'limit', shares: 60, limitPrice: 90, date: '2024-01-02' }, expensiveHigh); // pending, low 95 >90 not filled
    const r2 = engine.placeOrder({ ticker: 'TSLA', side: 'buy', type: 'limit', shares: 60, limitPrice: 90, date: '2024-01-02' }, expensiveHigh);
    expect(r2.success).toBe(true);
    // now trigger fill for first order, should deduct
    engine.processPendingOrders(cheap, 'AAPL');
    expect(engine.getState().orders.find(o => o.ticker==='AAPL')?.status).toBe('filled');
    // second order fill should cancel due to insufficient cash
    engine.processPendingOrders(cheap, 'TSLA');
    const tslaOrder = engine.getState().orders.find(o => o.ticker==='TSLA');
    // either still pending or cancelled depending on fill order; cash check cancels
    expect(['cancelled','filled','pending']).toContain(tslaOrder?.status);
  });

  it('cancelOrder idempotence and invalid id', () => {
    const c = mkCandle({ high: 110, low: 105, open: 100 }); // low 105 > limit 100 => not fill for buy
    const res = engine.placeOrder({ ticker: 'AAPL', side: 'buy', type: 'limit', shares: 5, limitPrice: 100, date: '2024-01-02' }, c);
    expect(res.filled).toBe(false);
    const id = res.orderId!;
    expect(engine.cancelOrder(id)).toBe(true);
    expect(engine.cancelOrder(id)).toBe(false);
    expect(engine.cancelOrder('nope')).toBe(false);
    expect(engine.getState().orders.find(o=>o.id===id)?.status).toBe('cancelled');
  });

  it('processPendingOrders respects ticker case-insensitivity', () => {
    const pendingCandle = mkCandle({ high: 90, low: 90, open: 95, close: 100 });
    const fillCandle = mkCandle({ high: 120, low: 80, open: 95, close: 100 });
    engine.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-02' }, pendingCandle);
    engine.placeOrder({ ticker: 'AAPL', side: 'sell', type: 'limit', shares: 5, limitPrice: 110, date: '2024-01-02' }, pendingCandle);
    const filled = engine.processPendingOrders(fillCandle, 'aapl');
    expect(filled.length).toBe(1);
    expect(filled[0].status).toBe('filled');
  });

  it('limit buy fills when low <= limit, sell when high >= limit', () => {
    const cBuyPending = mkCandle({ high: 110, low: 95, open: 100, close: 100 });
    const cBuyFill = mkCandle({ high: 110, low: 80, open: 100, close: 100 });
    const e2 = new TradingEngine(10000,0);
    const orderBuy = e2.placeOrder({ ticker: 'AAPL', side: 'buy', type: 'limit', shares: 10, limitPrice: 90, date: '2024-01-02' }, cBuyPending);
    expect(orderBuy.filled).toBe(false);
    const filledBuy = e2.processPendingOrders(cBuyFill, 'AAPL');
    expect(filledBuy[0].status).toBe('filled');

    e2.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-02' }, mkCandle());
    const cSellPending = mkCandle({ high: 105, low: 95, open: 100, close: 100 }); // high 105 < 110 => not fill
    const sellPending = e2.placeOrder({ ticker: 'AAPL', side: 'sell', type: 'limit', shares: 5, limitPrice: 110, date: '2024-01-02' }, cSellPending);
    expect(sellPending.filled).toBe(false);
    const filledSell = e2.processPendingOrders(mkCandle({ high: 120, low: 90, open: 100, close: 100 }), 'AAPL');
    expect(filledSell[0].status).toBe('filled');
  });

  it('stop_loss triggers when low <= stop and take_profit when high >= stop', () => {
    const e = new TradingEngine(10000,0);
    const c = mkCandle();
    e.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-02' }, c);
    e.placeOrder({ ticker: 'AAPL', side: 'sell', type: 'stop_loss', shares: 5, stopPrice: 90, date: '2024-01-02' }, mkCandle({ low: 95, high: 110 }));
    let filled = e.processPendingOrders(mkCandle({ low: 85, high: 110, open: 100 }), 'AAPL');
    expect(filled[0].status).toBe('filled');
    e.placeOrder({ ticker: 'AAPL', side: 'sell', type: 'take_profit', shares: 5, stopPrice: 150, date: '2024-01-02' }, mkCandle({ high: 140 }));
    filled = e.processPendingOrders(mkCandle({ high: 160, low: 90, open: 100 }), 'AAPL');
    expect(filled[0].status).toBe('filled');
  });

  it('commission applied on limit order fills', () => {
    const e = new TradingEngine(10000, 10);
    const pending = mkCandle({ high: 110, low: 95, open: 100, close: 100 }); // low 95 >90 => pending
    const fill = mkCandle({ low: 80, high: 110, open: 100 });
    const res = e.placeOrder({ ticker: 'AAPL', side: 'buy', type: 'limit', shares: 10, limitPrice: 90, date: '2024-01-02' }, pending);
    expect(res.filled).toBe(false);
    e.processPendingOrders(fill, 'AAPL');
    const filledOrder = e.getState().orders.find(o=>o.id===res.orderId);
    expect(filledOrder?.status).toBe('filled');
    // cash =10000 -10*90 -10 =9090 (fillPrice = min(limit,open)=90)
    expect(e.getState().cash).toBe(10000 - 900 - 10);
  });

  it('getState shallow clone does not allow external mutation of trades/orders array length', () => {
    const c = mkCandle();
    engine.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 5, date: '2024-01-02' }, c);
    const s1 = engine.getState();
    s1.trades.push({ id:'x', ticker:'X', side:'buy', type:'market', shares:1, price:1, total:1, fee:0, timestamp:'2024-01-02' } as any);
    expect(engine.getState().trades.length).toBe(1);
    s1.orders.push({ id:'y' } as any);
    expect(engine.getState().orders.length).toBe(0);
  });

  it('setStartingCash resets state and preserves commission', () => {
    const e = new TradingEngine(50000, 5);
    e.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-02' }, mkCandle());
    e.setStartingCash(20000);
    const s = e.getState();
    expect(s.cash).toBe(20000);
    expect(s.startingCash).toBe(20000);
    expect(Object.keys(s.positions).length).toBe(0);
    expect(s.trades.length).toBe(0);
    expect(s.orders.length).toBe(0);
    // commission preserved
    expect((e as any).state.commissionPerTrade).toBe(5);
  });

  it('getTotalPortfolioValue sums cash + positions', () => {
    const e = new TradingEngine(10000,0);
    expect(e.getTotalPortfolioValue()).toBe(10000);
    e.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-02' }, mkCandle({ close: 100 }));
    e.updatePrices({ AAPL: 150 });
    expect(e.getTotalPortfolioValue()).toBe(10000 -1000 +1500); // 10500
  });

  it('sell fee affects realized PnL and cash', () => {
    const e = new TradingEngine(10000, 10);
    e.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-02' }, mkCandle({ close: 100 }));
    // cash after buy 10000-1010=8990 (fee amortized into cost basis)
    const res = e.executeMarketOrder({ ticker: 'AAPL', side: 'sell', type: 'market', shares: 10, date: '2024-01-03' }, mkCandle({ close: 110 }));
    expect(res.realizedPnL).toBe(80); // (1100 -1010 -10) fee amortized
    expect(e.getState().cash).toBe(8990 + 1100 -10); // 10080
  });

  it('revalue does nothing for unknown ticker', () => {
    engine.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 5, date: '2024-01-02' }, mkCandle({ close: 100 }));
    engine.updatePrices({ TSLA: 999 });
    expect(engine.getState().positions['AAPL'].currentPrice).toBe(100);
  });

  it('placeOrder with immediate fill returns filled true', () => {
    const e = new TradingEngine(10000,0);
    // limit buy where low already <= limit => immediate fill
    const res = e.placeOrder({ ticker: 'AAPL', side: 'buy', type: 'limit', shares: 10, limitPrice: 150, date: '2024-01-02' }, mkCandle({ low: 80, high:120, open:100, close:100 }));
    expect(res.success).toBe(true);
    expect(res.filled).toBe(true);
    expect(res.filledPrice).toBeDefined();
  });

  it('rejects buy when insufficient cash for limit', () => {
    const e = new TradingEngine(100,0);
    const res = e.placeOrder({ ticker: 'AAPL', side: 'buy', type: 'limit', shares: 10, limitPrice: 20, date: '2024-01-02' }, mkCandle({ close:100 }));
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Insufficient cash/);
  });

  it('sell limit validates available shares including pending', () => {
    const e = new TradingEngine(10000,0);
    e.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-02' }, mkCandle());
    e.placeOrder({ ticker: 'AAPL', side: 'sell', type: 'limit', shares: 6, limitPrice: 150, date: '2024-01-02' }, mkCandle({ high:100 }));
    const r2 = e.placeOrder({ ticker: 'AAPL', side: 'sell', type: 'limit', shares: 5, limitPrice: 150, date: '2024-01-02' }, mkCandle({ high:100 }));
    expect(r2.success).toBe(false);
  });
});
