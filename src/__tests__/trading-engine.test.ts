import { describe, it, expect, beforeEach } from 'vitest';
import { TradingEngine } from '../engine/trading/trading-engine';
import { Candle } from '../model/types';

describe('Trading Engine Core', () => {
  let engine: TradingEngine;

  const sampleCandle: Candle = {
    time: '2024-01-02',
    open: 150,
    high: 155,
    low: 149,
    close: 150,
    volume: 1000000,
  };

  beforeEach(() => {
    engine = new TradingEngine(100000, 0);
  });

  it('initializes with starting cash and empty holdings', () => {
    const state = engine.getState();
    expect(state.cash).toBe(100000);
    expect(Object.keys(state.positions).length).toBe(0);
    expect(state.trades.length).toBe(0);
  });

  it('executes market buy order correctly', () => {
    const result = engine.executeMarketOrder(
      { ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-02' },
      sampleCandle
    );

    expect(result.success).toBe(true);
    expect(result.filledPrice).toBe(150);
    expect(result.totalCost).toBe(1500);

    const state = engine.getState();
    expect(state.cash).toBe(98500);
    expect(state.positions['AAPL']).toBeDefined();
    expect(state.positions['AAPL'].shares).toBe(10);
    expect(state.positions['AAPL'].avgCost).toBe(150);
    expect(state.positions['AAPL'].currentValue).toBe(1500);
    expect(state.trades.length).toBe(1);
    expect(state.trades[0].side).toBe('buy');
  });

  it('averages cost basis across multiple buys at different prices', () => {
    // Buy 10 @ $150 = $1500
    engine.executeMarketOrder(
      { ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-02' },
      { ...sampleCandle, close: 150 }
    );

    // Buy 10 @ $170 = $1700
    engine.executeMarketOrder(
      { ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-03' },
      { ...sampleCandle, close: 170, time: '2024-01-03' }
    );

    const state = engine.getState();
    expect(state.positions['AAPL'].shares).toBe(20);
    expect(state.positions['AAPL'].totalCost).toBe(3200);
    expect(state.positions['AAPL'].avgCost).toBe(160); // (1500 + 1700) / 20 = 160
  });

  it('rejects buy order when cash is insufficient', () => {
    const result = engine.executeMarketOrder(
      { ticker: 'AAPL', side: 'buy', type: 'market', shares: 1000, date: '2024-01-02' },
      sampleCandle // 1000 * 150 = 150,000 > 100,000
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient cash');
    expect(engine.getState().cash).toBe(100000);
  });

  it('executes partial and full sell orders calculating realized PnL correctly', () => {
    // Buy 20 shares @ $150 = $3000
    engine.executeMarketOrder(
      { ticker: 'AAPL', side: 'buy', type: 'market', shares: 20, date: '2024-01-02' },
      { ...sampleCandle, close: 150 }
    );

    // Partial Sell 10 shares @ $180 (cost basis $150) -> Realized gain $300
    const sellResult = engine.executeMarketOrder(
      { ticker: 'AAPL', side: 'sell', type: 'market', shares: 10, date: '2024-01-10' },
      { ...sampleCandle, close: 180, time: '2024-01-10' }
    );

    expect(sellResult.success).toBe(true);
    expect(sellResult.realizedPnL).toBe(300);

    let state = engine.getState();
    expect(state.cash).toBe(97000 + 1800); // 98800
    expect(state.positions['AAPL'].shares).toBe(10);
    expect(state.positions['AAPL'].realizedPnL).toBe(300);

    // Full Sell remaining 10 shares @ $140 (cost basis $150) -> Realized loss -$100
    const finalSellResult = engine.executeMarketOrder(
      { ticker: 'AAPL', side: 'sell', type: 'market', shares: 10, date: '2024-01-15' },
      { ...sampleCandle, close: 140, time: '2024-01-15' }
    );

    expect(finalSellResult.success).toBe(true);
    expect(finalSellResult.realizedPnL).toBe(-100);

    state = engine.getState();
    expect(state.positions['AAPL']).toBeUndefined(); // liquidated
    expect(state.cash).toBe(98800 + 1400); // 100200
  });

  it('rejects sell order when attempting to sell unowned or excessive shares', () => {
    const result = engine.executeMarketOrder(
      { ticker: 'TSLA', side: 'sell', type: 'market', shares: 5, date: '2024-01-02' },
      sampleCandle
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Insufficient shares');
  });

  it('revalues positions when updatePrices is called', () => {
    engine.executeMarketOrder(
      { ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-02' },
      { ...sampleCandle, close: 150 }
    );

    engine.updatePrices({ AAPL: 200 });

    const pos = engine.getState().positions['AAPL'];
    expect(pos.currentPrice).toBe(200);
    expect(pos.currentValue).toBe(2000);
    expect(pos.unrealizedPnL).toBe(500);
    expect(pos.unrealizedPnLPercent).toBeCloseTo(33.33, 1);
  });

  it('deducts commission per trade when configured', () => {
    engine.setCommission(4.95);
    engine.executeMarketOrder(
      { ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-02' },
      { ...sampleCandle, close: 150 }
    );

    const state = engine.getState();
    // Cash = 100000 - 1500 - 4.95 = 98495.05
    expect(state.cash).toBe(98495.05);
  });
});
