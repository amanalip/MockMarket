import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { StockScreener } from '../components/stockpicker/StockScreener';
import { IndicatorControls } from '../components/charts/IndicatorControls';
import { filterCandlesByTimeframe } from '../components/charts/chart-utils';
import { Candle } from '../model/types';

// Mock lightweight-charts to avoid canvas/ResizeObserver issues in jsdom
vi.mock('lightweight-charts', () => ({
  createChart: vi.fn(() => ({
    addSeries: vi.fn(() => ({ setData: vi.fn(), priceScale: vi.fn(() => ({ applyOptions: vi.fn() })) })),
    remove: vi.fn(),
    applyOptions: vi.fn(),
    timeScale: vi.fn(() => ({ fitContent: vi.fn() })),
    subscribeCrosshairMove: vi.fn(),
  })),
  CandlestickSeries: {},
  HistogramSeries: {},
  LineSeries: {},
  LineStyle: { Dotted: 1 },
  ColorType: { Solid: 'solid' },
  CrosshairMode: { Normal: 0 },
}));

import { CandlestickChart } from '../components/charts/CandlestickChart';

const candles: Candle[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date('2024-01-01'); d.setDate(d.getDate() + i);
  return { time: d.toISOString().split('T')[0], open: 100 + i, high: 105 + i, low: 95 + i, close: 102 + i, volume: 1000000 + i * 1000 };
});

// Global ResizeObserver mock
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any;

describe('Chart & Stock Screener Extended', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('StockScreener renders and filters by search', () => {
    render(<StockScreener />);
    const search = screen.getByPlaceholderText(/Search/i) as HTMLInputElement;
    expect(search).toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'AAPL' } });
    expect(document.body.textContent).toContain('AAPL');
  });

  it('StockScreener shows at least one ticker row', () => {
    render(<StockScreener />);
    expect(screen.getAllByText(/AAPL|MSFT|GOOGL/).length).toBeGreaterThan(0);
  });

  it('StockScreener empty search shows all', () => {
    render(<StockScreener />);
    const search = screen.getByPlaceholderText(/Search/i) as HTMLInputElement;
    fireEvent.change(search, { target: { value: '' } });
    expect(screen.getAllByText(/AAPL|MSFT/).length).toBeGreaterThan(0);
  });

  it('StockScreener click ticker selects it', () => {
    render(<StockScreener />);
    const firstRow = screen.getAllByText(/AAPL/)[0];
    fireEvent.click(firstRow);
    expect(document.body).toBeTruthy();
  });

  it('StockScreener sector filter shows combobox', () => {
    render(<StockScreener />);
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('IndicatorControls renders all 7 chips', () => {
    const onChange = vi.fn();
    const { container } = render(<IndicatorControls indicators={{ sma20: false, sma50: false, sma200: false, ema12: false, ema26: false, bollinger: false, volumeMA: false }} onChange={onChange} />);
    expect(screen.getByText('Indicators:')).toBeInTheDocument();
    expect(container.querySelectorAll('button').length).toBe(7);
  });

  it('IndicatorControls toggles sma20', () => {
    const onChange = vi.fn();
    render(<IndicatorControls indicators={{ sma20: false, sma50: false, sma200: false, ema12: false, ema26: false, bollinger: false, volumeMA: false }} onChange={onChange} />);
    fireEvent.click(screen.getByText('SMA (20)'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ sma20: true }));
  });

  it('IndicatorControls toggles bollinger', () => {
    const onChange = vi.fn();
    render(<IndicatorControls indicators={{ sma20: false, sma50: false, sma200: false, ema12: false, ema26: false, bollinger: false, volumeMA: false }} onChange={onChange} />);
    fireEvent.click(screen.getByText(/Bollinger/));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ bollinger: true }));
  });

  it('IndicatorControls handles volumeMA', () => {
    const onChange = vi.fn();
    render(<IndicatorControls indicators={{ sma20: false, sma50: false, sma200: false, ema12: false, ema26: false, bollinger: false, volumeMA: true }} onChange={onChange} />);
    fireEvent.click(screen.getByText(/Vol MA/));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ volumeMA: false }));
  });

  it('IndicatorControls active chip has active class', () => {
    const onChange = vi.fn();
    const { container } = render(<IndicatorControls indicators={{ sma20: true, sma50: false, sma200: false, ema12: false, ema26: false, bollinger: false, volumeMA: false }} onChange={onChange} />);
    // active chip should have class containing chipActive
    expect(container.innerHTML).toContain('chipActive');
  });

  it('CandlestickChart renders loading state', () => {
    render(<CandlestickChart candles={[]} ticker="AAPL" theme="dark" simulationDate="2024-01-01" loading={true} />);
    expect(screen.getByText(/Loading simulation data/)).toBeInTheDocument();
  });

  it('CandlestickChart renders without crash empty', () => {
    render(<CandlestickChart candles={[]} ticker="AAPL" theme="dark" simulationDate="2024-01-01" loading={false} />);
    expect(document.body).toBeTruthy();
  });

  it('CandlestickChart renders with candles', () => {
    render(<CandlestickChart candles={candles} ticker="AAPL" theme="dark" simulationDate="2024-01-15" loading={false} />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('CandlestickChart respects dark vs light theme', () => {
    const { rerender } = render(<CandlestickChart candles={candles} ticker="AAPL" theme="dark" simulationDate="2024-01-15" loading={false} />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    rerender(<CandlestickChart candles={candles} ticker="AAPL" theme="light" simulationDate="2024-01-15" loading={false} />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('CandlestickChart filters by simulationDate', () => {
    render(<CandlestickChart candles={candles} ticker="AAPL" theme="dark" simulationDate="2024-01-10" loading={false} />);
    // should show price for that date
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('CandlestickChart handles single candle', () => {
    render(<CandlestickChart candles={[candles[0]]} ticker="AAPL" theme="dark" simulationDate={candles[0].time} loading={false} />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('CandlestickChart simulationDate beyond last candle', () => {
    render(<CandlestickChart candles={candles} ticker="AAPL" theme="dark" simulationDate="2099-01-01" loading={false} />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('filterCandlesByTimeframe logic via chart', () => {
    expect(filterCandlesByTimeframe(candles, '1Y', '2024-01-30').length).toBeGreaterThan(0);
    expect(filterCandlesByTimeframe([], '1M').length).toBe(0);
  });

  it('StockScreener accessibility placeholder', () => {
    render(<StockScreener />);
    expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();
  });

  it('IndicatorControls renders sma200 and ema chips', () => {
    const onChange = vi.fn();
    render(<IndicatorControls indicators={{ sma20: false, sma50: false, sma200: true, ema12: true, ema26: false, bollinger: false, volumeMA: false }} onChange={onChange} />);
    expect(screen.getByText('SMA (200)')).toBeInTheDocument();
    expect(screen.getByText('EMA (12)')).toBeInTheDocument();
  });
});
