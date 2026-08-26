import { describe, it, expect, beforeEach } from 'vitest';
import { usePortfolioStore, useUIStore } from '../store';
import { Candle } from '../model/types';

describe('Trade UI & Store Synchronization', () => {
  const sampleCandle: Candle = {
    time: '2024-01-02',
    open: 150,
    high: 155,
    low: 148,
    close: 150,
    volume: 500000,
  };

  beforeEach(() => {
    usePortfolioStore.getState().resetPortfolio(100000);
  });

  it('records trade execution and updates portfolio state', () => {
    const { executeTrade } = usePortfolioStore.getState();
    const result = executeTrade(
      {
        ticker: 'MSFT',
        side: 'buy',
        type: 'market',
        shares: 10,
        date: '2024-01-02',
      },
      sampleCandle
    );

    expect(result.success).toBe(true);
    expect(result.filledPrice).toBe(150);

    const updatedState = usePortfolioStore.getState();
    expect(updatedState.cash).toBe(98500);
    expect(updatedState.positions['MSFT'].shares).toBe(10);
    expect(updatedState.trades.length).toBe(1);
    expect(updatedState.trades[0].ticker).toBe('MSFT');
  });

  it('manages toast notification queue cleanly', () => {
    const { addToast } = useUIStore.getState();
    addToast('Bought 10 shares of MSFT', 'success');

    const state = useUIStore.getState();
    expect(state.toasts.length).toBe(1);
    expect(state.toasts[0].message).toBe('Bought 10 shares of MSFT');
    expect(state.toasts[0].type).toBe('success');
  });
});
