import { describe, it, expect, beforeEach } from 'vitest';
import { TradingEngine } from '../engine/trading/trading-engine';
import { Candle } from '../model/types';

describe('Limit Orders & Stop Losses', () => {
  let engine: TradingEngine;

  beforeEach(() => {
    engine = new TradingEngine(100000, 0);
  });

  it('places a buy limit order and keeps it pending when price is above limit', () => {
    const candle: Candle = {
      time: '2024-01-02',
      open: 150,
      high: 155,
      low: 148,
      close: 152,
      volume: 100000,
    };

    // Place buy limit at $140 (low was 148 -> should not fill)
    const result = engine.placeOrder(
      {
        ticker: 'AAPL',
        side: 'buy',
        type: 'limit',
        shares: 10,
        limitPrice: 140,
        date: '2024-01-02',
      },
      candle
    );

    expect(result.success).toBe(true);
    expect(result.filled).toBe(false);
    expect(engine.getState().orders.length).toBe(1);
    expect(engine.getState().orders[0].status).toBe('pending');
  });

  it('fills buy limit order when candle low crosses below limit price', () => {
    // Initial placement without fill
    engine.placeOrder({
      ticker: 'AAPL',
      side: 'buy',
      type: 'limit',
      shares: 10,
      limitPrice: 145,
      date: '2024-01-02',
    });

    // Next day candle drops to 142
    const nextCandle: Candle = {
      time: '2024-01-03',
      open: 146,
      high: 147,
      low: 142,
      close: 144,
      volume: 200000,
    };

    const filledOrders = engine.processPendingOrders(nextCandle, 'AAPL');
    expect(filledOrders.length).toBe(1);
    expect(filledOrders[0].status).toBe('filled');
    expect(engine.getState().positions['AAPL'].shares).toBe(10);
    expect(engine.getState().trades.length).toBe(1);
  });

  it('triggers stop loss when price drops below stop threshold', () => {
    // Buy 10 shares @ 150
    engine.executeMarketOrder(
      { ticker: 'TSLA', side: 'buy', type: 'market', shares: 10, date: '2024-01-02' },
      { time: '2024-01-02', open: 150, high: 152, low: 148, close: 150, volume: 50000 }
    );

    // Place stop loss at 140
    engine.placeOrder({
      ticker: 'TSLA',
      side: 'sell',
      type: 'stop_loss',
      shares: 10,
      stopPrice: 140,
      date: '2024-01-02',
    });

    // Crash candle low touches 135
    const crashCandle: Candle = {
      time: '2024-01-05',
      open: 142,
      high: 143,
      low: 135,
      close: 138,
      volume: 800000,
    };

    const filled = engine.processPendingOrders(crashCandle, 'TSLA');
    expect(filled.length).toBe(1);
    expect(filled[0].status).toBe('filled');
    expect(engine.getState().positions['TSLA']).toBeUndefined(); // liquidated
  });

  it('triggers take profit when price spikes above target threshold', () => {
    // Buy 10 shares @ 150
    engine.executeMarketOrder(
      { ticker: 'NVDA', side: 'buy', type: 'market', shares: 10, date: '2024-01-02' },
      { time: '2024-01-02', open: 150, high: 152, low: 148, close: 150, volume: 50000 }
    );

    // Place take profit at 180
    engine.placeOrder({
      ticker: 'NVDA',
      side: 'sell',
      type: 'take_profit',
      shares: 10,
      stopPrice: 180,
      date: '2024-01-02',
    });

    // Spike candle reaches 185
    const rallyCandle: Candle = {
      time: '2024-01-08',
      open: 175,
      high: 185,
      low: 174,
      close: 182,
      volume: 900000,
    };

    const filled = engine.processPendingOrders(rallyCandle, 'NVDA');
    expect(filled.length).toBe(1);
    expect(filled[0].status).toBe('filled');
    expect(engine.getState().positions['NVDA']).toBeUndefined();
  });

  it('cancels pending order correctly', () => {
    const res = engine.placeOrder({
      ticker: 'AAPL',
      side: 'buy',
      type: 'limit',
      shares: 10,
      limitPrice: 120,
      date: '2024-01-02',
    });

    expect(res.orderId).toBeDefined();
    const cancelled = engine.cancelOrder(res.orderId!);
    expect(cancelled).toBe(true);
    expect(engine.getState().orders[0].status).toBe('cancelled');
  });
});
