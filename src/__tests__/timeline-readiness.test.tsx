import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Candle } from '../model/types';
import { DatedCandleResult } from '../data/loader';
import { usePortfolioStore, useUIStore } from '../store';

const { alignedLoaderMock } = vi.hoisted(() => ({ alignedLoaderMock: vi.fn() }));
vi.mock('../data/loader', async (importOriginal) => ({
  ...await importOriginal<typeof import('../data/loader')>(),
  loadLatestCandlesOnOrBefore: alignedLoaderMock,
}));

import { SimulationBar } from '../components/timeline/SimulationBar';

const candle = (time: string, close: number): Candle => ({ time, open: close, high: close, low: close, close, volume: 1 });
const selectedCandles = [candle('2024-01-01', 100), candle('2024-01-02', 120), candle('2024-01-05', 125)];

describe('Timeline valuation and rewind invariants', () => {
  beforeEach(() => {
    alignedLoaderMock.mockReset();
    usePortfolioStore.getState().resetPortfolio(100000);
    useUIStore.setState({ selectedTicker: 'AAPL', simulationDate: '2024-01-01', isPlaying: false, toasts: [] });
  });

  it('revalues every holding with its own latest price', async () => {
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-01' }, candle('2024-01-01', 100));
    usePortfolioStore.getState().executeTrade({ ticker: 'MSFT', side: 'buy', type: 'market', shares: 5, date: '2024-01-01' }, candle('2024-01-01', 200));
    alignedLoaderMock.mockResolvedValue({
      AAPL: { status: 'available', ticker: 'AAPL', targetDate: '2024-01-02', candle: candle('2024-01-02', 120) },
      MSFT: { status: 'available', ticker: 'MSFT', targetDate: '2024-01-02', candle: candle('2024-01-01', 250) },
    });
    render(<SimulationBar candles={selectedCandles} />);

    fireEvent.click(screen.getByText('+1 Day'));

    await waitFor(() => expect(usePortfolioStore.getState().positions.MSFT.currentPrice).toBe(250));
    expect(usePortfolioStore.getState().positions.AAPL.currentPrice).toBe(120);
    expect(usePortfolioStore.getState().positions.MSFT.currentPrice).not.toBe(120);
    expect(usePortfolioStore.getState().history.at(-1)).toMatchObject({ date: '2024-01-02', investedValue: 2450 });
  });

  it('preserves a holding previous mark when its dated price is unavailable', async () => {
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 1, date: '2024-01-01' }, candle('2024-01-01', 100));
    usePortfolioStore.getState().executeTrade({ ticker: 'MSFT', side: 'buy', type: 'market', shares: 1, date: '2024-01-01' }, candle('2024-01-01', 200));
    alignedLoaderMock.mockResolvedValue({
      AAPL: { status: 'available', ticker: 'AAPL', targetDate: '2024-01-02', candle: candle('2024-01-02', 120) },
      MSFT: { status: 'unavailable', ticker: 'MSFT', targetDate: '2024-01-02', reason: 'no-candle-on-or-before' },
    } satisfies Record<string, DatedCandleResult>);
    render(<SimulationBar candles={selectedCandles} />);

    fireEvent.click(screen.getByText('+1 Day'));

    await waitFor(() => expect(usePortfolioStore.getState().positions.AAPL.currentPrice).toBe(120));
    expect(usePortfolioStore.getState().positions.MSFT.currentPrice).toBe(200);
    expect(useUIStore.getState().toasts.at(-1)?.message).toContain('MSFT');
  });

  it('rejects rewinds after filled trades without mutating account state', () => {
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 1, date: '2024-01-05' }, candle('2024-01-05', 100));
    useUIStore.setState({ simulationDate: '2024-01-05' });
    const before = usePortfolioStore.getState();
    render(<SimulationBar candles={selectedCandles} />);

    fireEvent.change(screen.getByDisplayValue('2024-01-05'), { target: { value: '2024-01-02' } });

    expect(useUIStore.getState().simulationDate).toBe('2024-01-05');
    expect(usePortfolioStore.getState().cash).toBe(before.cash);
    expect(usePortfolioStore.getState().trades).toEqual(before.trades);
    expect(usePortfolioStore.getState().positions).toEqual(before.positions);
  });

  it('rejects rewinds with pending orders and allows activity-free rewind with history pruning', () => {
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'limit', shares: 1, limitPrice: 50, date: '2024-01-05' });
    useUIStore.setState({ simulationDate: '2024-01-05' });
    expect(useUIStore.getState().setSimulationDate('2024-01-02')).toBe(false);
    expect(usePortfolioStore.getState().orders[0].status).toBe('pending');

    usePortfolioStore.getState().resetPortfolio(100000);
    usePortfolioStore.setState({ history: [
      { date: '2024-01-01', cash: 2, investedValue: 0, totalValue: 2, dailyPnL: 0, totalPnL: 0 },
      { date: '2024-01-01', cash: 1, investedValue: 0, totalValue: 1, dailyPnL: 0, totalPnL: 0 },
      { date: '2024-01-05', cash: 1, investedValue: 0, totalValue: 1, dailyPnL: 0, totalPnL: 0 },
    ] });
    expect(useUIStore.getState().setSimulationDate('2024-01-02')).toBe(true);
    expect(usePortfolioStore.getState().history.map((entry) => entry.date)).toEqual(['2024-01-01', '2024-01-02']);
    expect(usePortfolioStore.getState().history[0].cash).toBe(1);
  });
});
