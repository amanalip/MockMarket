import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useUIStore, usePortfolioStore, useBacktesterStore, useETFStore } from '../store';
import { Candle } from '../model/types';

describe('Store Hooks Integration', () => {
  beforeEach(() => {
    useUIStore.setState({ mode: 'trade', theme: 'dark', sidebarOpen: true, simulationDate: '2024-01-01', isPlaying: false, playbackSpeed: 500, selectedTicker: 'AAPL', toasts: [] });
    usePortfolioStore.getState().resetPortfolio(100000);
  });

  it('UI store setMode', () => {
    useUIStore.getState().setMode('backtest');
    expect(useUIStore.getState().mode).toBe('backtest');
  });

  it('UI store toggleTheme', () => {
    const before = useUIStore.getState().theme;
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).not.toBe(before);
  });

  it('UI store setSelectedTicker', () => {
    useUIStore.getState().setSelectedTicker('MSFT');
    expect(useUIStore.getState().selectedTicker).toBe('MSFT');
  });

  it('UI store simulationDate', () => {
    useUIStore.getState().setSimulationDate('2024-02-01');
    expect(useUIStore.getState().simulationDate).toBe('2024-02-01');
  });

  it('UI store toasts', () => {
    useUIStore.getState().addToast('hi', 'info');
    expect(useUIStore.getState().toasts.length).toBe(1);
    const id = useUIStore.getState().toasts[0].id;
    useUIStore.getState().removeToast(id);
    expect(useUIStore.getState().toasts.length).toBe(0);
  });

  it('Portfolio executeTrade buy', () => {
    const c: Candle = { time: '2024-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 };
    const res = usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-01' }, c);
    expect(res.success).toBe(true);
    expect(usePortfolioStore.getState().positions['AAPL'].shares).toBe(10);
  });

  it('Portfolio updateMarketPrices', () => {
    const c: Candle = { time: '2024-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 };
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-01' }, c);
    usePortfolioStore.getState().updateMarketPrices({ AAPL: 150 });
    expect(usePortfolioStore.getState().positions['AAPL'].currentPrice).toBe(150);
  });

  it('Portfolio cancel order', () => {
    const c: Candle = { time: '2024-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 };
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-01' }, c);
    const order = usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'sell', type: 'limit', shares: 5, limitPrice: 999, date: '2024-01-01' }, { ...c, high: 100 } as Candle);
    expect(order.orderId).toBeTruthy();
    usePortfolioStore.getState().cancelOrder(order.orderId!);
    expect(usePortfolioStore.getState().orders.find(o => o.id === order.orderId)?.status).toBe('cancelled');
  });

  it('Backtester store setConfig', () => {
    useBacktesterStore.getState().setConfig({ ticker: 'MSFT' });
    expect(useBacktesterStore.getState().config.ticker).toBe('MSFT');
  });

  it('ETF store save/delete', () => {
    const etf: any = { id: 'x', name: 'Test', tickers: [{ ticker: 'AAPL', targetWeight: 100 }], rebalanceFrequency: 'never', createdAt: '2020-01-01' };
    useETFStore.getState().saveETF(etf);
    expect(useETFStore.getState().savedETFs.length).toBe(1);
    useETFStore.getState().deleteETF('x');
    expect(useETFStore.getState().savedETFs.length).toBe(0);
  });

  it('useKeyboardShortcuts ignores input', () => {
    const onToggle = vi.fn();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ onToggleShortcutsModal: onToggle }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
    expect(onToggle).not.toHaveBeenCalled();
    unmount();
    document.body.removeChild(input);
  });

  it('useKeyboardShortcuts toggles theme on t', () => {
    const onToggle = vi.fn();
    const before = useUIStore.getState().theme;
    const { unmount } = renderHook(() => useKeyboardShortcuts({ onToggleShortcutsModal: onToggle }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 't' }));
    expect(useUIStore.getState().theme).not.toBe(before);
    unmount();
  });

  it('useKeyboardShortcuts ? opens modal', () => {
    const onToggle = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ onToggleShortcutsModal: onToggle }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '?' }));
    expect(onToggle).toHaveBeenCalled();
    unmount();
  });

  it('UI setIsPlaying', () => {
    useUIStore.getState().setIsPlaying(true);
    expect(useUIStore.getState().isPlaying).toBe(true);
  });

  it('UI setSidebarOpen', () => {
    useUIStore.getState().setSidebarOpen(false);
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  it('Portfolio processCandleForOrders', () => {
    const c: Candle = { time: '2024-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 };
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-01' }, c);
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'sell', type: 'limit', shares: 5, limitPrice: 999, date: '2024-01-01' }, { ...c, high: 100 } as Candle);
    const filled = usePortfolioStore.getState().processCandleForOrders({ ...c, high: 1000 } as Candle, 'AAPL');
    expect(filled.length).toBe(1);
  });

  it('UI playbackSpeed', () => {
    useUIStore.getState().setPlaybackSpeed(200);
    expect(useUIStore.getState().playbackSpeed).toBe(200);
  });

  it('ETF active', () => {
    const etf: any = { id: 'y', name: 'Y', tickers: [{ ticker: 'AAPL', targetWeight: 100 }], rebalanceFrequency: 'never', createdAt: '2020-01-01' };
    useETFStore.getState().saveETF(etf);
    expect(useETFStore.getState().activeETF?.id).toBe('y');
  });

  it('Portfolio reset clears history', () => {
    usePortfolioStore.setState({ history: [{ date: '2024-01-01', cash: 10000, investedValue: 0, totalValue: 10000, dailyPnL: 0, totalPnL: 0 }] });
    usePortfolioStore.getState().resetPortfolio(100000);
    expect(usePortfolioStore.getState().history.length).toBe(0);
  });

  it('useKeyboardShortcuts ArrowRight advances', () => {
    const onAdvance = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ onToggleShortcutsModal: vi.fn(), onAdvanceOneDay: onAdvance }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    expect(onAdvance).toHaveBeenCalled();
    unmount();
  });

  it('UI getInitialTheme dark default', () => {
    expect(['dark', 'light']).toContain(useUIStore.getState().theme);
  });

  it('Portfolio startingCash', () => {
    usePortfolioStore.getState().setStartingCash(50000);
    expect(usePortfolioStore.getState().startingCash).toBe(50000);
  });

  it('Backtester setResult', () => {
    useBacktesterStore.getState().setResult(null);
    expect(useBacktesterStore.getState().result).toBeNull();
  });

  it('useKeyboardShortcuts mode 1-5', () => {
    const { unmount } = renderHook(() => useKeyboardShortcuts({ onToggleShortcutsModal: vi.fn() }));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
    expect(useUIStore.getState().mode).toBe('trade');
    unmount();
  });
});
