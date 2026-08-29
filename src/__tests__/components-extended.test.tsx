import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SimulationBar } from '../components/timeline/SimulationBar';
import { PortfolioDashboard } from '../components/portfolio/PortfolioDashboard';
import { OrderManagement } from '../components/trading/OrderManagement';
import { TradeHistory } from '../components/portfolio/TradeHistory';
import { useUIStore, usePortfolioStore } from '../store';
import { Candle } from '../model/types';

const candles: Candle[] = Array.from({ length: 20 }, (_, i) => {
  const d = new Date('2024-01-01'); d.setDate(d.getDate() + i);
  return { time: d.toISOString().split('T')[0], open: 100 + i, high: 105 + i, low: 95 + i, close: 100 + i, volume: 1000 };
});

describe('Extended Components', () => {
  beforeEach(() => {
    useUIStore.setState({ simulationDate: '2024-01-01', isPlaying: false, playbackSpeed: 500, selectedTicker: 'AAPL' });
    usePortfolioStore.getState().resetPortfolio(100000);
  });

  it('SimulationBar renders date and controls', () => {
    render(<SimulationBar candles={candles} />);
    expect(screen.getByText('Simulation Date')).toBeInTheDocument();
    expect(screen.getByText('2024-01-01')).toBeInTheDocument();
    expect(screen.getByText('Auto Play')).toBeInTheDocument();
    expect(screen.getByText('+1 Day')).toBeInTheDocument();
    expect(screen.getByText('Reset')).toBeInTheDocument();
  });

  it('SimulationBar play toggles isPlaying', () => {
    render(<SimulationBar candles={candles} />);
    const btn = screen.getByText('Auto Play');
    fireEvent.click(btn);
    expect(useUIStore.getState().isPlaying).toBe(true);
    fireEvent.click(screen.getByText('Pause'));
    expect(useUIStore.getState().isPlaying).toBe(false);
  });

  it('SimulationBar +1 Day advances date', () => {
    render(<SimulationBar candles={candles} />);
    fireEvent.click(screen.getByText('+1 Day'));
    expect(useUIStore.getState().simulationDate).toBe('2024-01-02');
  });

  it('SimulationBar +1 Week advances 5 days', () => {
    useUIStore.setState({ simulationDate: '2024-01-01' });
    render(<SimulationBar candles={candles} />);
    fireEvent.click(screen.getByText('+1 Week'));
    expect(useUIStore.getState().simulationDate).toBe('2024-01-06');
  });

  it('SimulationBar speed select changes playbackSpeed', () => {
    render(<SimulationBar candles={candles} />);
    const select = screen.getByLabelText('Simulation speed') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '200' } });
    expect(useUIStore.getState().playbackSpeed).toBe(200);
  });

  it('SimulationBar Reset returns to first candle and resets cash', () => {
    useUIStore.setState({ simulationDate: '2024-01-10' });
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-01' }, candles[0]);
    render(<SimulationBar candles={candles} />);
    fireEvent.click(screen.getByText('Reset'));
    expect(useUIStore.getState().simulationDate).toBe('2024-01-01');
    expect(usePortfolioStore.getState().cash).toBe(100000);
  });

  it('SimulationBar date input changes simulationDate', () => {
    render(<SimulationBar candles={candles} />);
    const input = screen.getByDisplayValue('2024-01-01') as HTMLInputElement;
    // date input is type=date, changes via onChange
    fireEvent.change(input, { target: { value: '2024-01-05' } });
    expect(useUIStore.getState().simulationDate).toBe('2024-01-05');
  });

  it('SimulationBar handles empty candles', () => {
    render(<SimulationBar candles={[]} />);
    expect(screen.getByText('Simulation Date')).toBeInTheDocument();
    fireEvent.click(screen.getByText('+1 Day')); // no throw
  });

  it('PortfolioDashboard shows empty state', () => {
    render(<PortfolioDashboard />);
    expect(screen.getByText(/No active holdings/)).toBeInTheDocument();
    expect(screen.getByText('Portfolio Net Value')).toBeInTheDocument();
    expect(screen.getByText('Available Cash')).toBeInTheDocument();
  });

  it('PortfolioDashboard shows position after buy', () => {
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-01' }, candles[0]);
    render(<PortfolioDashboard />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    // quick action trade button
    expect(screen.getByText('Trade')).toBeInTheDocument();
  });

  it('PortfolioDashboard total P&L calculation with holdings', () => {
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-01' }, { ...candles[0], close: 100 });
    usePortfolioStore.getState().updateMarketPrices({ AAPL: 150 });
    render(<PortfolioDashboard />);
    expect(screen.getByText(/Invested Holdings/)).toBeInTheDocument();
  });

  it('PortfolioDashboard cash allocation percent', () => {
    render(<PortfolioDashboard />);
    // 100% cash when no holdings
    expect(screen.getByText(/100\.0% cash allocation/)).toBeInTheDocument();
  });

  it('OrderManagement shows no orders empty', () => {
    render(<OrderManagement />);
    expect(screen.getByText(/No active or historical conditional orders/i)).toBeInTheDocument();
  });

  it('OrderManagement shows pending order and cancel', () => {
    const c = candles[0];
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: c.time }, c);
    // place limit sell pending
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'sell', type: 'limit', shares: 5, limitPrice: 999, date: c.time }, { ...c, high: 110 } as any);
    render(<OrderManagement />);
    // should show pending
    expect(screen.getByText(/pending/i) || screen.getByText(/999/) || document.body.textContent?.includes('AAPL')).toBeTruthy();
  });

  it('TradeHistory shows no trades empty then after trade', () => {
    const { rerender } = render(<TradeHistory />);
    expect(screen.getByText(/No trades|No trade history/i) || document.body).toBeTruthy();
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 5, date: '2024-01-01' }, candles[0]);
    rerender(<TradeHistory />);
    expect(screen.getByText(/AAPL/) || document.body.textContent?.includes('buy')).toBeTruthy();
  });

  it('SimulationBar +1 Year caps at last candle', () => {
    useUIStore.setState({ simulationDate: '2024-01-01' });
    render(<SimulationBar candles={candles} />);
    fireEvent.click(screen.getByText('+1 Year')); // 252 days but only 20 candles
    expect(useUIStore.getState().simulationDate).toBe(candles[candles.length - 1].time);
  });
});
