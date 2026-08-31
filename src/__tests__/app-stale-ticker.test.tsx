import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Candle } from '../model/types';
import { usePortfolioStore, useUIStore } from '../store';

const { loadTickerDataMock } = vi.hoisted(() => ({ loadTickerDataMock: vi.fn() }));

vi.mock('../data/loader', async (importOriginal) => ({
  ...await importOriginal<typeof import('../data/loader')>(),
  loadTickerData: loadTickerDataMock,
}));
vi.mock('../components/ui/Layout', () => ({ Layout: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock('../components/charts/CandlestickChart', () => ({
  CandlestickChart: ({ candles, ticker }: { candles: Candle[]; ticker: string }) => (
    <div data-testid="chart-probe">{ticker}:{candles.map((candle) => candle.close).join(',')}</div>
  ),
}));
vi.mock('../components/timeline/SimulationBar', () => ({ SimulationBar: () => null }));
vi.mock('../components/stockpicker/StockScreener', () => ({ StockScreener: () => null }));
vi.mock('../components/portfolio/PortfolioDashboard', () => ({ PortfolioDashboard: () => null }));
vi.mock('../components/portfolio/TradeHistory', () => ({ TradeHistory: () => null }));
vi.mock('../components/trading/OrderManagement', () => ({ OrderManagement: () => null }));
vi.mock('../components/portfolio/RiskDashboard', () => ({ RiskDashboard: () => null }));
vi.mock('../components/backtester/BacktestConfigPanel', () => ({ BacktestConfigPanel: () => null }));
vi.mock('../components/backtester/BacktestResults', () => ({ BacktestResults: () => null }));
vi.mock('../components/etf/ETFBuilderForm', () => ({ ETFBuilderForm: () => null }));
vi.mock('../components/etf/ETFAnalyticsDashboard', () => ({ ETFAnalyticsDashboard: () => null }));
vi.mock('../components/etf/SavedETFsList', () => ({ SavedETFsList: () => null }));
vi.mock('../components/timeline/NewsFeed', () => ({ NewsFeed: () => null }));
vi.mock('../components/timemachine/TimeMachineCalculator', () => ({ TimeMachineCalculator: () => null }));
vi.mock('../components/scenarios/ScenarioCatalog', () => ({ ScenarioCatalog: () => null }));
vi.mock('../components/ui/ShortcutsModal', () => ({ ShortcutsModal: () => null }));
vi.mock('../components/ui/Toast', () => ({ ToastContainer: () => null }));

import { App } from '../App';

const aaplCandle: Candle = {
  time: '2024-01-02', open: 110, high: 112, low: 109, close: 111.11, volume: 1000,
};

describe('App ticker data ownership', () => {
  beforeEach(() => {
    loadTickerDataMock.mockReset();
    usePortfolioStore.getState().resetPortfolio(100000);
    useUIStore.setState({ mode: 'trade', selectedTicker: 'AAPL', simulationDate: '2024-01-02' });
  });

  it('does not display or trade a previous ticker candle when the next load fails', async () => {
    loadTickerDataMock.mockImplementation((ticker: string) => ticker === 'AAPL'
      ? Promise.resolve([aaplCandle])
      : Promise.reject(new Error('MSFT unavailable')));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<App />);

    await waitFor(() => expect(screen.getByTestId('chart-probe')).toHaveTextContent('AAPL:111.11'));
    expect(screen.getByRole('button', { name: 'Submit Buy AAPL' })).toBeEnabled();

    act(() => useUIStore.getState().setSelectedTicker('MSFT'));

    expect(screen.getByTestId('chart-probe')).toHaveTextContent('MSFT:');
    expect(screen.getByTestId('chart-probe')).not.toHaveTextContent('111.11');
    const submit = screen.getByRole('button', { name: 'Submit Buy MSFT' });
    expect(submit).toBeDisabled();
    fireEvent.submit(submit.closest('form')!);
    expect(usePortfolioStore.getState().trades).toHaveLength(0);
    expect(usePortfolioStore.getState().orders).toHaveLength(0);
    await waitFor(() => expect(consoleError).toHaveBeenCalled());
  });
});
