import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { PortfolioDashboard } from '../components/portfolio/PortfolioDashboard';
import { TradingEngine } from '../engine/trading/trading-engine';
import { Candle } from '../model/types';
import { usePortfolioStore } from '../store';

const candle = (time: string, close: number): Candle => ({ time, open: close, high: close, low: close, close, volume: 1 });

describe('Trading correctness blockers', () => {
  beforeEach(() => usePortfolioStore.getState().resetPortfolio(100000));

  it('does not fill a pending order from a candle before its creation date', () => {
    const engine = new TradingEngine(1000);
    engine.placeOrder({ ticker: 'AAPL', side: 'buy', type: 'limit', shares: 1, limitPrice: 100, date: '2024-01-03' });

    expect(engine.processPendingOrders(candle('2024-01-02', 90), 'AAPL')).toEqual([]);
    expect(engine.getState().orders[0].status).toBe('pending');
    expect(engine.getState().trades).toHaveLength(0);
    expect(engine.processPendingOrders(candle('2024-01-03', 90), 'AAPL')).toHaveLength(1);
  });

  it('tracks realized P&L through averaging, partial sale, closure, fees, and reopening', () => {
    const engine = new TradingEngine(10000, 10);
    engine.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 5, date: '2024-01-01' }, candle('2024-01-01', 100));
    engine.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 5, date: '2024-01-02' }, candle('2024-01-02', 100));
    expect(engine.getState().realizedPnL).toBe(0);

    engine.executeMarketOrder({ ticker: 'AAPL', side: 'sell', type: 'market', shares: 4, date: '2024-01-03' }, candle('2024-01-03', 110));
    expect(engine.getState().realizedPnL).toBe(22);
    engine.executeMarketOrder({ ticker: 'AAPL', side: 'sell', type: 'market', shares: 6, date: '2024-01-04' }, candle('2024-01-04', 110));
    expect(engine.getState().realizedPnL).toBe(60);
    expect(engine.getState().positions.AAPL).toBeUndefined();

    engine.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 1, date: '2024-01-05' }, candle('2024-01-05', 90));
    expect(engine.getState().realizedPnL).toBe(60);
  });

  it('adds realized P&L from conditional fills and resets it with the account', () => {
    const engine = new TradingEngine(10000);
    engine.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 2, date: '2024-01-01' }, candle('2024-01-01', 100));
    engine.placeOrder({ ticker: 'AAPL', side: 'sell', type: 'limit', shares: 2, limitPrice: 120, date: '2024-01-02' });
    engine.processPendingOrders(candle('2024-01-03', 125), 'AAPL');
    expect(engine.getState().realizedPnL).toBe(50);
    engine.setStartingCash(5000);
    expect(engine.getState().realizedPnL).toBe(0);
  });

  it('displays the authoritative store realized P&L and leaves buys at zero', () => {
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-01' }, candle('2024-01-01', 100));
    const { rerender } = render(<PortfolioDashboard />);
    expect(screen.getByText('Realized P&L').parentElement).toHaveTextContent('+$0.00');

    act(() => {
      usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'sell', type: 'market', shares: 10, date: '2024-01-02' }, candle('2024-01-02', 110));
    });
    rerender(<PortfolioDashboard />);
    expect(usePortfolioStore.getState().realizedPnL).toBe(100);
    expect(screen.getByText('Realized P&L').parentElement).toHaveTextContent('+$100.00');
  });
});
