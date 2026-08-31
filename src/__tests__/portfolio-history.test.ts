import { beforeEach, describe, expect, it } from 'vitest';
import { PortfolioSnapshot } from '../model/types';
import { upsertPortfolioSnapshot, usePortfolioStore, useUIStore } from '../store';

const snapshot = (date: string, totalValue: number): PortfolioSnapshot => ({
  date,
  cash: totalValue,
  investedValue: 0,
  totalValue,
  dailyPnL: 999,
  totalPnL: totalValue - 100000,
});

describe('Portfolio history snapshots', () => {
  beforeEach(() => {
    usePortfolioStore.getState().resetPortfolio(100000);
    useUIStore.setState({ simulationDate: '2024-01-01' });
  });

  it('sorts dates, replaces duplicates, and recomputes chronological daily P&L', () => {
    let history = upsertPortfolioSnapshot([], snapshot('2024-01-03', 103000));
    history = upsertPortfolioSnapshot(history, snapshot('2024-01-01', 100000));
    history = upsertPortfolioSnapshot(history, snapshot('2024-01-02', 101000));
    history = upsertPortfolioSnapshot(history, snapshot('2024-01-02', 102000));

    expect(history.map((entry) => entry.date)).toEqual(['2024-01-01', '2024-01-02', '2024-01-03']);
    expect(history.map((entry) => entry.totalValue)).toEqual([100000, 102000, 103000]);
    expect(history.map((entry) => entry.dailyPnL)).toEqual([0, 2000, 1000]);
  });

  it('records fills, successful cancellations, date changes, and repricing', () => {
    const store = usePortfolioStore.getState();
    store.executeTrade(
      { ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-01' },
      { time: '2024-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1 }
    );
    expect(usePortfolioStore.getState().history).toHaveLength(1);

    useUIStore.getState().setSimulationDate('2024-01-02');
    expect(usePortfolioStore.getState().history.map((entry) => entry.date)).toEqual(['2024-01-01', '2024-01-02']);

    usePortfolioStore.getState().updateMarketPrices({ AAPL: 110 });
    expect(usePortfolioStore.getState().history.at(-1)).toMatchObject({ date: '2024-01-02', totalValue: 100100, dailyPnL: 100 });

    const order = usePortfolioStore.getState().executeTrade({
      ticker: 'AAPL', side: 'sell', type: 'limit', shares: 1, limitPrice: 200, date: '2024-01-02',
    });
    usePortfolioStore.getState().cancelOrder(order.orderId!);
    expect(usePortfolioStore.getState().history).toHaveLength(2);
    expect(usePortfolioStore.getState().orders[0].status).toBe('cancelled');
  });

  it('records pending-order fills and clears history for cash-flow boundaries', () => {
    usePortfolioStore.getState().executeTrade({
      ticker: 'MSFT', side: 'buy', type: 'limit', shares: 2, limitPrice: 50, date: '2024-01-01',
    });
    expect(usePortfolioStore.getState().history).toHaveLength(0);

    usePortfolioStore.getState().processCandleForOrders(
      { time: '2024-01-02', open: 50, high: 51, low: 49, close: 50, volume: 1 },
      'MSFT'
    );
    expect(usePortfolioStore.getState().history.map((entry) => entry.date)).toEqual(['2024-01-02']);

    usePortfolioStore.getState().setStartingCash(50000);
    expect(usePortfolioStore.getState().history).toEqual([]);
    usePortfolioStore.getState().recordSnapshot('2024-01-03');
    usePortfolioStore.getState().resetPortfolio(25000);
    expect(usePortfolioStore.getState().history).toEqual([]);
  });
});
