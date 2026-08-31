import { beforeEach, describe, expect, it } from 'vitest';
import { TradingEngine } from '../engine/trading/trading-engine';
import { Candle } from '../model/types';
import { usePortfolioStore } from '../store';

const candle = (time: string, price: number): Candle => ({
  time,
  open: price,
  high: price,
  low: price,
  close: price,
  volume: 1,
});

describe('Order reservations and ticker normalization', () => {
  it('reserves trigger notional plus commission and releases it on cancellation', () => {
    const engine = new TradingEngine(1000, 5);
    const result = engine.placeOrder({
      ticker: ' aapl ', side: 'buy', type: 'limit', shares: 5, limitPrice: 100, date: '2024-01-01',
    });

    expect(engine.getState()).toMatchObject({ cash: 1000, reservedCash: 505, availableCash: 495 });
    expect(engine.getState().orders[0]).toMatchObject({ ticker: 'AAPL', reservedCash: 505 });
    expect(engine.cancelOrder(result.orderId!)).toBe(true);
    expect(engine.getState()).toMatchObject({ cash: 1000, reservedCash: 0, availableCash: 1000 });
    expect(engine.getState().orders[0].reservedCash).toBe(0);
  });

  it('releases a reservation on fill and deducts only the actual fill cost', () => {
    const engine = new TradingEngine(1000, 5);
    engine.placeOrder({
      ticker: 'AAPL', side: 'buy', type: 'limit', shares: 5, limitPrice: 100, date: '2024-01-01',
    });

    expect(engine.processPendingOrders(candle('2024-01-02', 90), ' aApL ')).toHaveLength(1);
    expect(engine.getState()).toMatchObject({ cash: 545, reservedCash: 0, availableCash: 545 });
    expect(engine.getState().orders[0].status).toBe('filled');
    expect(engine.getState().orders[0].reservedCash).toBe(0);
  });

  it('releases reservations when execution is rejected or an order expires', () => {
    const rejected = new TradingEngine(1000);
    rejected.placeOrder({
      ticker: 'AAPL', side: 'buy', type: 'stop_loss', shares: 10, stopPrice: 90, date: '2024-01-01',
    });
    rejected.processPendingOrders(candle('2024-01-02', 120), 'AAPL');
    expect(rejected.getState().orders[0].status).toBe('rejected');
    expect(rejected.getState()).toMatchObject({ cash: 1000, reservedCash: 0, availableCash: 1000 });

    const expired = new TradingEngine(1000);
    expired.placeOrder({
      ticker: 'AAPL', side: 'buy', type: 'limit', shares: 5, limitPrice: 100,
      date: '2024-01-01', expiresAt: '2024-01-02',
    });
    expired.processPendingOrders(candle('2024-01-03', 90), 'AAPL');
    expect(expired.getState().orders[0].status).toBe('expired');
    expect(expired.getState()).toMatchObject({ cash: 1000, reservedCash: 0, availableCash: 1000 });
  });

  it('canonicalizes mixed-case buys, sells, and repricing into one position', () => {
    const engine = new TradingEngine(1000);
    engine.executeMarketOrder(
      { ticker: ' aApL ', side: 'buy', type: 'market', shares: 5, date: '2024-01-01' },
      candle('2024-01-01', 100)
    );
    engine.updatePrices({ aapl: 110 });
    const sell = engine.executeMarketOrder(
      { ticker: 'AaPl', side: 'sell', type: 'market', shares: 2, date: '2024-01-02' },
      candle('2024-01-02', 110)
    );

    expect(sell.success).toBe(true);
    expect(Object.keys(engine.getState().positions)).toEqual(['AAPL']);
    expect(engine.getState().positions.AAPL).toMatchObject({ shares: 3, currentPrice: 110 });
    expect(engine.getState().trades.every((trade) => trade.ticker === 'AAPL')).toBe(true);
  });
});

describe('Portfolio store terminal synchronization', () => {
  beforeEach(() => usePortfolioStore.getState().resetPortfolio(1000));

  it('synchronizes rejected and expired non-fill transitions', () => {
    usePortfolioStore.getState().executeTrade({
      ticker: 'AAPL', side: 'buy', type: 'stop_loss', shares: 10, stopPrice: 90, date: '2024-01-01',
    });
    usePortfolioStore.getState().processCandleForOrders(candle('2024-01-02', 120), 'aapl');
    expect(usePortfolioStore.getState()).toMatchObject({ reservedCash: 0, availableCash: 1000 });
    expect(usePortfolioStore.getState().orders[0].status).toBe('rejected');

    usePortfolioStore.getState().executeTrade({
      ticker: 'MSFT', side: 'buy', type: 'limit', shares: 5, limitPrice: 100,
      date: '2024-01-02', expiresAt: '2024-01-02',
    });
    usePortfolioStore.getState().processCandleForOrders(candle('2024-01-03', 110), 'MsFt');
    expect(usePortfolioStore.getState()).toMatchObject({ reservedCash: 0, availableCash: 1000 });
    expect(usePortfolioStore.getState().orders[0].status).toBe('expired');
  });
});
