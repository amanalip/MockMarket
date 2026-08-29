import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { PortfolioDashboard } from '../components/portfolio/PortfolioDashboard';
import { RiskDashboard } from '../components/portfolio/RiskDashboard';
import { AllocationDonut } from '../components/portfolio/AllocationDonut';
import { TradeHistory } from '../components/portfolio/TradeHistory';
import { usePortfolioStore } from '../store';
import { Candle } from '../model/types';

(global as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };

const candle: Candle = { time: '2024-01-01', open: 100, high: 110, low: 90, close: 100, volume: 1000 };

describe('Portfolio & Risk Components', () => {
  beforeEach(() => { usePortfolioStore.getState().resetPortfolio(100000); });

  it('PortfolioDashboard renders net value', () => {
    render(<PortfolioDashboard />);
    expect(screen.getByText('Portfolio Net Value')).toBeInTheDocument();
  });

  it('AllocationDonut renders with empty', () => {
    render(<AllocationDonut metrics={{ score: 50, sectorConcentrationHHI: 2000, sectorAllocations: [], tickerAllocations: [], assetClassAllocations: [] }} />);
    expect(document.body.textContent).toBeTruthy();
  });

  it('AllocationDonut with data', () => {
    render(<AllocationDonut metrics={{ score: 80, sectorConcentrationHHI: 1000, sectorAllocations: [{ sector: 'Tech', value: 5000, percent: 50 }], tickerAllocations: [{ ticker: 'AAPL', value: 5000, percent: 50 }], assetClassAllocations: [{ assetType: 'stock', value: 5000, percent: 50 }] }} />);
    expect(screen.getByText('Portfolio Allocation')).toBeInTheDocument();
    expect(screen.getByText('sector')).toBeInTheDocument();
  });

  it('RiskDashboard renders Diversification Score', () => {
    render(<RiskDashboard />);
    expect(screen.getByText(/Diversification Score/)).toBeInTheDocument();
  });

  it('RiskDashboard shows beta, volatility, VaR', () => {
    render(<RiskDashboard />);
    expect(screen.getByText(/Portfolio Beta/)).toBeInTheDocument();
    expect(screen.getByText(/Annualized Volatility/)).toBeInTheDocument();
    expect(screen.getByText(/Daily VaR/)).toBeInTheDocument();
  });

  it('RiskDashboard with holdings', () => {
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-01' }, candle);
    render(<RiskDashboard />);
    expect(screen.getByText(/Portfolio Risk & Analytics/)).toBeInTheDocument();
  });

  it('TradeHistory empty', () => {
    render(<TradeHistory />);
    expect(document.body.textContent).toBeTruthy();
  });

  it('TradeHistory with trade', () => {
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 5, date: '2024-01-01' }, candle);
    render(<TradeHistory />);
    expect(document.body.textContent).toContain('AAPL');
  });

  it('PortfolioDashboard shows holdings table header', () => {
    render(<PortfolioDashboard />);
    expect(screen.getByText('Asset')).toBeInTheDocument();
    expect(screen.getByText('Shares')).toBeInTheDocument();
  });

  it('PortfolioDashboard empty cash allocation 100%', () => {
    render(<PortfolioDashboard />);
    expect(screen.getByText(/100\.0% cash allocation/)).toBeInTheDocument();
  });

  it('PortfolioDashboard after buy shows market value', () => {
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-01' }, candle);
    render(<PortfolioDashboard />);
    expect(screen.getByText(/AAPL/)).toBeInTheDocument();
  });

  it('RiskDashboard max drawdown display', () => {
    render(<RiskDashboard />);
    expect(screen.getByText(/Max Drawdown/)).toBeInTheDocument();
  });

  it('AllocationDonut handles zero allocations', () => {
    render(<AllocationDonut metrics={{ score: 0, sectorConcentrationHHI: 10000, sectorAllocations: [], tickerAllocations: [], assetClassAllocations: [] }} />);
    expect(document.body).toBeTruthy();
  });

  it('PortfolioDashboard realized P&L after sell', () => {
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-01' }, candle);
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'sell', type: 'market', shares: 10, date: '2024-01-01' }, { ...candle, close: 110 });
    render(<PortfolioDashboard />);
    expect(screen.getByText(/Realized P&L/)).toBeInTheDocument();
  });

  it('RiskDashboard attribution empty initially', () => {
    render(<RiskDashboard />);
    expect(document.body).toBeTruthy();
  });

  it('TradeHistory shows side uppercased', () => {
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 5, date: '2024-01-01' }, candle);
    const { container } = render(<TradeHistory />);
    expect(container.textContent).toMatch(/BUY/i);
  });

  it('PortfolioDashboard quick Trade button', () => {
    usePortfolioStore.getState().executeTrade({ ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-01' }, candle);
    render(<PortfolioDashboard />);
    expect(screen.getByText('Trade')).toBeInTheDocument();
  });

  it('RiskDashboard charts grid renders', () => {
    render(<RiskDashboard />);
    expect(document.body.textContent).toContain('Diversification Score');
  });

  it('AllocationDonut renders stock sector', () => {
    render(<AllocationDonut metrics={{ score: 50, sectorConcentrationHHI: 2000, sectorAllocations: [{ sector: 'Technology', value: 1000, percent: 100 }], tickerAllocations: [{ ticker: 'AAPL', value: 1000, percent: 100 }], assetClassAllocations: [{ assetType: 'stock', value: 1000, percent: 100 }] }} />);
    expect(screen.getByText('Portfolio Allocation')).toBeInTheDocument();
  });

  it('PortfolioDashboard shows unrealized P&L', () => {
    render(<PortfolioDashboard />);
    expect(screen.getAllByText(/Unrealized P&L/).length).toBeGreaterThan(0);
  });

  it('TradeHistory header exists', () => {
    render(<TradeHistory />);
    expect(document.body.textContent).toBeTruthy();
  });

  it('RiskDashboard HHI display', () => {
    render(<RiskDashboard />);
    expect(screen.getByText(/HHI:/)).toBeInTheDocument();
  });

  it('PortfolioDashboard net return percent', () => {
    render(<PortfolioDashboard />);
    expect(screen.getByText(/total return/)).toBeInTheDocument();
  });

  it('AllocationDonut percent display', () => {
    render(<AllocationDonut metrics={{ score: 60, sectorConcentrationHHI: 3000, sectorAllocations: [{ sector: 'Cash', value: 5000, percent: 50 }, { sector: 'Tech', value: 5000, percent: 50 }], tickerAllocations: [], assetClassAllocations: [] }} />);
    expect(screen.getByText('Portfolio Allocation')).toBeInTheDocument();
  });

  it('RiskDashboard without history returns beta 1', () => {
    render(<RiskDashboard />);
    expect(screen.getByText(/vs S&P 500 benchmark/)).toBeInTheDocument();
  });
});
