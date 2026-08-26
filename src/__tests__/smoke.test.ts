import { describe, it, expect } from 'vitest';
import { useUIStore, usePortfolioStore } from '../store';

describe('Smoke tests for MockMarket foundation', () => {
  it('initializes UI store with default values', () => {
    const uiState = useUIStore.getState();
    expect(uiState.mode).toBe('trade');
    expect(['dark', 'light']).toContain(uiState.theme);
    expect(uiState.selectedTicker).toBe('AAPL');
  });

  it('initializes Portfolio store with standard starting balance', () => {
    const portfolioState = usePortfolioStore.getState();
    expect(portfolioState.cash).toBe(100000);
    expect(portfolioState.startingCash).toBe(100000);
    expect(portfolioState.trades).toEqual([]);
    expect(portfolioState.orders).toEqual([]);
  });

  it('updates portfolio cash balance properly', () => {
    const { setCash } = usePortfolioStore.getState();
    setCash(75000);
    expect(usePortfolioStore.getState().cash).toBe(75000);
    setCash(100000); // reset back
  });
});
