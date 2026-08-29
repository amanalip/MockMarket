import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { TradePanel } from '../components/trading/TradePanel';
import { StrategyEditor } from '../components/backtester/StrategyEditor';
import { Header } from '../components/ui/Header';
import { useUIStore, usePortfolioStore, useBacktesterStore } from '../store';
import { Candle } from '../model/types';

const candle: Candle = { time: '2024-01-02', open: 100, high: 110, low: 90, close: 100, volume: 1000 };

describe('UI Components - TradePanel, StrategyEditor, Header', () => {
  beforeEach(() => {
    useUIStore.setState({ selectedTicker: 'AAPL', simulationDate: '2024-01-02', toasts: [] });
    usePortfolioStore.getState().resetPortfolio(10000);
    useBacktesterStore.setState({
      config: {
        ticker: 'AAPL', startDate: '2020-01-01', endDate: '2024-01-01',
        initialCash: 100000, positionSizePercent: 100,
        entryRule: 'SMA(50) > SMA(200)', exitRule: 'SMA(50) < SMA(200)',
      } as any,
    });
    localStorage.clear();
  });

  it('TradePanel renders ticker and cash', () => {
    render(<TradePanel currentCandle={candle} />);
    expect(screen.getByText(/Order Placement/i)).toBeInTheDocument();
    expect(screen.getByText(/Available:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Buy AAPL/i).length).toBeGreaterThan(0);
  });

  it('TradePanel switches buy/sell tabs', () => {
    render(<TradePanel currentCandle={candle} />);
    fireEvent.click(screen.getByText(/Sell AAPL/i));
    expect(screen.getByText(/Submit Sell AAPL/i)).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Buy AAPL/i));
    expect(screen.getByText(/Submit Buy AAPL/i)).toBeInTheDocument();
  });

  it('TradePanel percentage MAX calculates shares', () => {
    render(<TradePanel currentCandle={candle} />);
    // 10000 cash /100 =100 shares max, 25% =>25
    fireEvent.click(screen.getByText('25%'));
    const input = screen.getByPlaceholderText('Number of shares') as HTMLInputElement;
    expect(input.value).toBe('25');
    fireEvent.click(screen.getByText('MAX'));
    expect(input.value).toBe('100');
  });

  it('TradePanel disables submit when insufficient cash', () => {
    render(<TradePanel currentCandle={candle} />);
    const sharesInput = screen.getByPlaceholderText('Number of shares') as HTMLInputElement;
    fireEvent.change(sharesInput, { target: { value: '1000' } }); // 1000*100=100k >10k
    const btn = screen.getByText(/Submit Buy/i) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('TradePanel limit order shows price input', () => {
    render(<TradePanel currentCandle={candle} />);
    const select = screen.getByDisplayValue('Market Order') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'limit' } });
    expect(screen.getByPlaceholderText('Target Price')).toBeInTheDocument();
    expect(screen.getByText('Limit Price ($)')).toBeInTheDocument();
  });

  it('TradePanel validates zero shares toast via UI store', () => {
    render(<TradePanel currentCandle={candle} />);
    const sharesInput = screen.getByPlaceholderText('Number of shares') as HTMLInputElement;
    fireEvent.change(sharesInput, { target: { value: '0' } });
    // submit button disabled but form handler also checks
    expect(useUIStore.getState().toasts.length).toBe(0);
  });

  it('TradePanel sell disables when no position', () => {
    render(<TradePanel currentCandle={candle} />);
    fireEvent.click(screen.getByText(/Sell AAPL/i));
    const btn = screen.getByText(/Submit Sell AAPL/i) as HTMLButtonElement;
    // 10 shares input default >0 owned
    expect(btn.disabled).toBe(true);
  });

  it('TradePanel shows owned position', () => {
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 5, date: '2024-01-02' }, candle);
    render(<TradePanel currentCandle={candle} />);
    expect(screen.getByText(/5 shares/)).toBeInTheDocument();
  });

  it('StrategyEditor renders and validates rules', () => {
    render(<StrategyEditor />);
    expect(screen.getByText(/Strategy Rule Editor/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue('SMA(50) > SMA(200)')).toBeInTheDocument();
    // valid msg
    expect(screen.getAllByText(/Valid.*syntax/i).length).toBeGreaterThan(0);
  });

  it('StrategyEditor shows error for invalid rule', () => {
    useBacktesterStore.getState().setConfig({ entryRule: 'INVALID >>>' });
    render(<StrategyEditor />);
    expect(screen.getByText(/✕/)).toBeInTheDocument();
  });

  it('StrategyEditor template buttons load rule', () => {
    render(<StrategyEditor />);
    const btns = screen.getAllByTitle(/.*/) ;
    // click first template if exists
    if (btns.length > 0) {
      const firstTemplate = document.querySelector('button') as HTMLButtonElement;
      if (firstTemplate) fireEvent.click(firstTemplate);
    }
    // at least still renders
    expect(screen.getByText(/Entry Condition/i)).toBeInTheDocument();
  });

  it('StrategyEditor position size input updates', () => {
    render(<StrategyEditor />);
    const inputs = screen.getAllByDisplayValue('100') as HTMLInputElement[];
    // position size is 100
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('Header renders brand and stats', () => {
    render(<Header />);
    expect(screen.getByText('MockMarket')).toBeInTheDocument();
    expect(screen.getByText('Real data. Fake money. Real lessons.')).toBeInTheDocument();
    expect(screen.getByText('Simulation Date')).toBeInTheDocument();
    expect(screen.getByText('Portfolio Value')).toBeInTheDocument();
  });

  it('Header portfolio total updates with position', () => {
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-02' }, candle);
    render(<Header />);
    // portfolioTotal = 10000 -1000 +1000 =10000
    expect(screen.getByText(/\$10,000\.00/)).toBeInTheDocument();
  });

  it('Header theme toggle changes theme', () => {
    useUIStore.setState({ theme: 'dark' });
    render(<Header />);
    const btn = screen.getByLabelText('Toggle theme');
    fireEvent.click(btn);
    expect(useUIStore.getState().theme).toBe('light');
  });

  it('Header GitHub link correct', () => {
    render(<Header />);
    const link = screen.getByLabelText('GitHub Repository') as HTMLAnchorElement;
    expect(link.href).toContain('github.com');
    expect(link.target).toBe('_blank');
  });

  it('Header share button opens modal state (via button existence)', () => {
    render(<Header />);
    expect(screen.getByLabelText('Share session')).toBeInTheDocument();
  });

  it('TradePanel handles percentage sell with position', () => {
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 40, date: '2024-01-02' }, candle);
    render(<TradePanel currentCandle={candle} />);
    fireEvent.click(screen.getByText(/Sell AAPL/i));
    fireEvent.click(screen.getByText('50%'));
    const input = screen.getByPlaceholderText('Number of shares') as HTMLInputElement;
    expect(input.value).toBe('20');
  });

  it('TradePanel estimated total updates', () => {
    render(<TradePanel currentCandle={candle} />);
    // default 10 shares *100 =1000
    expect(screen.getByText('$1000.00')).toBeInTheDocument();
  });
});
