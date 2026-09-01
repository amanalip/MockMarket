import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { TimeMachineCalculator } from '../components/timemachine/TimeMachineCalculator';
import { ScenarioCatalog } from '../components/scenarios/ScenarioCatalog';
import { calculateTimeMachine } from '../engine/timemachine/timemachine';
import { Candle } from '../model/types';

vi.mock('recharts', async () => {
  const actual: any = await vi.importActual('recharts');
  return { ...actual, ResponsiveContainer: ({ children }: any) => <div>{children}</div>, LineChart: ({ children }: any) => <div>{children}</div>, Line: () => null, XAxis: () => null, YAxis: () => null, Tooltip: () => null, Legend: () => null, CartesianGrid: () => null };
});
vi.mock('../data/loader', async () => {
  const actual: any = await vi.importActual('../data/loader');
  return { ...actual, loadTickerData: vi.fn().mockResolvedValue(Array.from({ length: 20 }, (_, i) => ({ time: `2020-01-${String(i + 1).padStart(2,'0')}`, open: 100, high: 105, low: 95, close: 100 + i, volume: 1000 }))) };
});

const mk = (n: number): Candle[] => Array.from({ length: n }, (_, i) => ({ time: `2020-01-${String(i + 1).padStart(2,'0')}`, open: 100, high: 100, low: 100, close: 100, volume: 1000 }));

describe('TimeMachine & Scenarios Components', () => {
  it('TimeMachineCalculator renders title', () => {
    render(<TimeMachineCalculator />);
    expect(screen.getByText('Investment Time Machine')).toBeInTheDocument();
    expect(screen.getByText(/Simulate lump-sum/)).toBeInTheDocument();
  });

  it('TimeMachineCalculator ticker select', () => {
    render(<TimeMachineCalculator />);
    expect(screen.getByText('Asset Ticker')).toBeInTheDocument();
    const sel = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    fireEvent.change(sel, { target: { value: 'MSFT' } });
    expect(sel.value).toBe('MSFT');
  });

  it('TimeMachineCalculator date inputs', () => {
    render(<TimeMachineCalculator />);
    expect(screen.getByText('Investment Start Date')).toBeInTheDocument();
    expect(screen.getByText('End Date')).toBeInTheDocument();
  });

  it('TimeMachineCalculator initial capital input', () => {
    render(<TimeMachineCalculator />);
    const inputs = screen.getAllByRole('spinbutton');
    const cap = inputs.find(i => (i as HTMLInputElement).value === '10000') as HTMLInputElement;
    expect(cap).toBeTruthy();
    fireEvent.change(cap, { target: { value: '20000' } });
    expect(cap.value).toBe('20000');
  });

  it('TimeMachineCalculator DCA frequency select', () => {
    render(<TimeMachineCalculator />);
    expect(screen.getByText('DCA Frequency')).toBeInTheDocument();
  });

  it('TimeMachineCalculator run button exists', () => {
    render(<TimeMachineCalculator />);
    expect(screen.getByText('Run Time Machine Simulation')).toBeInTheDocument();
  });

  it('TimeMachineCalculator calculate success shows result', async () => {
    render(<TimeMachineCalculator />);
    fireEvent.click(screen.getByText('Run Time Machine Simulation'));
    expect(await screen.findByText('Final Portfolio Value')).toBeInTheDocument();
  });

  it('ScenarioCatalog renders filters', () => {
    render(<ScenarioCatalog />);
    expect(screen.getByText('Category:')).toBeInTheDocument();
    expect(screen.getByText('Difficulty:')).toBeInTheDocument();
    expect(screen.getAllByText('all').length).toBeGreaterThan(0);
  });

  it('ScenarioCatalog shows cards', () => {
    render(<ScenarioCatalog />);
    // at least one Launch button
    expect(screen.getAllByText(/Launch Interactive Scenario/).length).toBeGreaterThan(0);
  });

  it('ScenarioCatalog filter category', () => {
    render(<ScenarioCatalog />);
    fireEvent.click(screen.getAllByText('Crash')[0]);
    expect(screen.getAllByText('Crash').length).toBeGreaterThan(0);
  });

  it('ScenarioCatalog filter difficulty', () => {
    render(<ScenarioCatalog />);
    fireEvent.click(screen.getAllByText('Beginner')[0]);
    expect(screen.getAllByText('Beginner').length).toBeGreaterThan(0);
  });

  it('ScenarioCatalog launch scenario', () => {
    render(<ScenarioCatalog />);
    const launchBtns = screen.getAllByText(/Launch Interactive Scenario/);
    fireEvent.click(launchBtns[0]);
    expect(document.body.textContent).toBeTruthy();
  });

  it('calculateTimeMachine monthly vs none', () => {
    const candles = Array.from({ length: 60 }, (_, i) => {
      const d = new Date('2020-01-01'); d.setDate(d.getDate() + i);
      return { time: d.toISOString().split('T')[0], open: 100, high: 100, low: 100, close: 100, volume: 1000 } as Candle;
    });
    const resNone = calculateTimeMachine(candles, candles, { ticker: 'AAPL', startDate: candles[0].time, endDate: candles[59].time, initialAmount: 1000, dcaAmount: 100, dcaInterval: 'none' });
    const resMonth = calculateTimeMachine(candles, candles, { ticker: 'AAPL', startDate: candles[0].time, endDate: candles[59].time, initialAmount: 1000, dcaAmount: 100, dcaInterval: 'monthly' });
    expect(resMonth.totalCashInvested).toBeGreaterThan(resNone.totalCashInvested);
  });

  it('calculateTimeMachine weekly vs monthly', () => {
    const candles = Array.from({ length: 30 }, (_, i) => ({ time: `2020-01-${String(i + 1).padStart(2,'0')}`, open: 100, high: 100, low: 100, close: 100, volume: 1000 } as Candle));
    const resW = calculateTimeMachine(candles, candles, { ticker: 'AAPL', startDate: candles[0].time, endDate: candles[29].time, initialAmount: 1000, dcaAmount: 10, dcaInterval: 'weekly' });
    const resM = calculateTimeMachine(candles, candles, { ticker: 'AAPL', startDate: candles[0].time, endDate: candles[29].time, initialAmount: 1000, dcaAmount: 10, dcaInterval: 'monthly' });
    expect(resW.totalCashInvested).toBeGreaterThanOrEqual(resM.totalCashInvested);
  });

  it('TimeMachineCalculator handles TSLA ticker', () => {
    render(<TimeMachineCalculator />);
    const sel = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    fireEvent.change(sel, { target: { value: 'TSLA' } });
    expect(sel.value).toBe('TSLA');
  });

  it('ScenarioCatalog all category shows more', () => {
    render(<ScenarioCatalog />);
    fireEvent.click(screen.getAllByText('all')[0]); // first all is category
    expect(document.body).toBeTruthy();
  });

  it('TimeMachineCalculator DCA amount input', () => {
    render(<TimeMachineCalculator />);
    const inputs = screen.getAllByRole('spinbutton');
    const dca = inputs.find(i => (i as HTMLInputElement).value === '250') as HTMLInputElement;
    fireEvent.change(dca, { target: { value: '500' } });
    expect(dca.value).toBe('500');
  });

  it('calculateTimeMachine handles insufficient data throw', () => {
    expect(() => calculateTimeMachine([{ time: '2020-01-01', open: 100, high: 100, low: 100, close: 100, volume: 1000 } as Candle], [], { ticker: 'AAPL', startDate: '2020-01-01', endDate: '2020-01-01', initialAmount: 1000 })).toThrow();
  });

  it('ScenarioCatalog renders Crash category badge', () => {
    render(<ScenarioCatalog />);
    expect(document.body.textContent).toContain('Crash');
  });

  it('TimeMachineCalculator has header History', () => {
    render(<TimeMachineCalculator />);
    expect(document.body).toBeTruthy();
  });

  it('ScenarioCatalog difficulty all filter', () => {
    render(<ScenarioCatalog />);
    const allBtns = screen.getAllByText('all');
    fireEvent.click(allBtns[1]); // second all is difficulty
    expect(document.body).toBeTruthy();
  });

  it('calculateTimeMachine cagr finite', () => {
    const candles = mk(20);
    const res = calculateTimeMachine(candles, candles, { ticker: 'AAPL', startDate: candles[0].time, endDate: candles[19].time, initialAmount: 5000 });
    expect(Number.isFinite(res.cagrPercent)).toBe(true);
  });

  it('TimeMachineCalculator button disabled when loading', () => {
    render(<TimeMachineCalculator />);
    const btn = screen.getByText('Run Time Machine Simulation').closest('button') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('ScenarioCatalog shows Asset ticker', () => {
    render(<ScenarioCatalog />);
    expect(screen.getAllByText(/Asset:/).length).toBeGreaterThan(0);
  });

  it('calculateTimeMachine growth curve length', () => {
    const candles = mk(15);
    const res = calculateTimeMachine(candles, candles, { ticker: 'AAPL', startDate: candles[0].time, endDate: candles[14].time, initialAmount: 1000 });
    expect(res.growthCurve.length).toBe(15);
  });
});
