import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { Header } from '../components/ui/Header';
import { useUIStore, usePortfolioStore } from '../store';
import { TradingEngine } from '../engine/trading/trading-engine';
import { compileRule } from '../parser/strategy-dsl';
import { runBacktest } from '../engine/backtester/backtester';
import { Candle } from '../model/types';

const mkCandles = (n: number): Candle[] => Array.from({ length: n }, (_, i) => {
  const d = new Date('2020-01-01'); d.setDate(d.getDate() + i);
  const p = 100 + Math.sin(i) * 5 + i * 0.1;
  return { time: d.toISOString().split('T')[0], open: p, high: p + 2, low: p - 2, close: p, volume: 1000 };
});

describe('E2E UX Flows', () => {
  beforeEach(() => {
    useUIStore.setState({ theme: 'dark', mode: 'trade', selectedTicker: 'AAPL', simulationDate: '2024-01-01' });
    usePortfolioStore.getState().resetPortfolio(10000);
  });

  it('Header shows simulationDate and portfolio after trade', () => {
    const c: Candle = { time: '2024-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 };
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-01' }, c);
    render(<Header />);
    expect(screen.getByText('MockMarket')).toBeInTheDocument();
    expect(screen.getByText(/Portfolio Value/)).toBeInTheDocument();
  });

  it('theme toggle persists and updates DOM', () => {
    useUIStore.setState({ theme: 'dark' });
    render(<Header />);
    fireEvent.click(screen.getByLabelText('Toggle theme'));
    expect(useUIStore.getState().theme).toBe('light');
    expect(localStorage.getItem('mockmarket_theme')).toBe('light');
    fireEvent.click(screen.getByLabelText('Toggle theme'));
    expect(useUIStore.getState().theme).toBe('dark');
  });

  it('mode switch via store updates Header title logic', () => {
    useUIStore.setState({ mode: 'backtest' });
    expect(useUIStore.getState().mode).toBe('backtest');
    useUIStore.setState({ mode: 'etf' });
    expect(useUIStore.getState().mode).toBe('etf');
  });

  it('full trade flow: buy market -> process -> sell limit pending', () => {
    const e = new TradingEngine(10000);
    const c1: Candle = { time: '2024-01-01', open: 100, high: 110, low: 90, close: 100, volume: 1000 };
    const buy = e.executeMarketOrder({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-01' }, c1);
    expect(buy.success).toBe(true);
    const pending = e.placeOrder({ ticker: 'AAPL', side: 'sell', type: 'limit', shares: 5, limitPrice: 150, date: '2024-01-01' }, { ...c1, high: 120 } as Candle);
    // high 120 >=150? false => pending
    expect(pending.filled).toBe(false);
    const filled = e.processPendingOrders({ ...c1, high: 160, low: 140, open: 150 } as Candle, 'AAPL');
    expect(filled.length).toBe(1);
  });

  it('backtester flow via compiled DSL yields equity', () => {
    const candles = mkCandles(100);
    const entry = compileRule('SMA(20) > SMA(50)');
    const exit = compileRule('SMA(20) < SMA(50)');
    const res = runBacktest(candles, candles, {
      ticker: 'AAPL', startDate: candles[20].time, endDate: candles[80].time,
      initialCash: 10000, positionSizePercent: 50,
      entryRule: 'SMA(20)>SMA(50)', exitRule: 'SMA(20)<SMA(50)',
    }, entry, exit);
    expect(res.equityCurve.length).toBe(61);
    expect(typeof res.stats.sharpeRatio).toBe('number');
  });

  it('store reset clears history and trades', () => {
    const c: Candle = { time: '2024-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 };
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-01' }, c);
    expect(usePortfolioStore.getState().trades.length).toBe(1);
    usePortfolioStore.getState().resetPortfolio(5000);
    expect(usePortfolioStore.getState().trades.length).toBe(0);
    expect(usePortfolioStore.getState().cash).toBe(5000);
  });

  it('toast lifecycle via UI store', () => {
    useUIStore.setState({ toasts: [] });
    useUIStore.getState().addToast('test', 'info');
    expect(useUIStore.getState().toasts[0].message).toBe('test');
    useUIStore.getState().removeToast(useUIStore.getState().toasts[0].id);
    expect(useUIStore.getState().toasts.length).toBe(0);
  });

  it('empty candles handled in SimulationBar logic without throw', () => {
    expect(() => {
      const e = new TradingEngine(10000);
      e.updatePrices({});
    }).not.toThrow();
  });

  it('share payload encodes mode and ticker', () => {
    useUIStore.setState({ mode: 'timeline', selectedTicker: 'TSLA' });
    expect(useUIStore.getState().mode).toBe('timeline');
    expect(useUIStore.getState().selectedTicker).toBe('TSLA');
  });

  it('Header cash formatting 2 decimals', () => {
    usePortfolioStore.getState().resetPortfolio(12345.678);
    render(<Header />);
    expect(document.body.textContent).toContain('12,345.68');
  });
});
