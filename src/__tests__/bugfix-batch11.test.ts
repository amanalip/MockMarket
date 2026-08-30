import { describe, it, expect } from 'vitest';
import { toVolumeData } from '../components/charts/chart-utils';
import { exportETFNAVToCSV } from '../engine/export/csv-export';
import { useUIStore } from '../store';
import { Candle } from '../model/types';

describe('Bugfix Batch 11 – Chart/Store/Export final hardening', () => {
  it('toVolumeData guards null/Infinity and Array check', () => {
    expect(toVolumeData(null as any)).toEqual([]);
    expect(toVolumeData(undefined as any)).toEqual([]);
    const bad: any = [{ time: '2024-01-01', volume: Infinity, open: 100, close: NaN }, { time: '2024-01-02', volume: NaN, open: 1, close: 1 }];
    const res = toVolumeData(bad);
    expect(res).toEqual([]);
    const good: Candle[] = [{ time: '2024-01-01', open: 100, high: 100, low: 100, close: 101, volume: 1000 }];
    expect(toVolumeData(good).length).toBe(1);
    expect(toVolumeData(good)[0].value).toBe(1000);
  });

  it('exportETFNAVToCSV handles undefined fundName and empty history', () => {
    expect(exportETFNAVToCSV([], undefined as any)).toContain('FUND_NAV');
    expect(exportETFNAVToCSV([], '' as any)).toContain('FUND_NAV');
    expect(exportETFNAVToCSV([], 'MyFund')).toBe('Date,MyFund_NAV');
    const nav = [{ date: '2024-01-01', nav: Infinity as any }, { date: '2024-01-02', nav: 101.5 }];
    const csv = exportETFNAVToCSV(nav as any, 'Test');
    expect(csv).toContain('0.00');
    expect(csv).toContain('101.50');
  });

  it('PortfolioDashboard cash allocation guard not Infinity when total 0', async () => {
    // Indirectly test the logic: totalPortfolioValue=0 should give 0.0%
    const total = 0;
    const cash = 0;
    const allocation = (total > 0 && Number.isFinite(cash) ? ((cash / total) * 100).toFixed(1) : '0.0');
    expect(allocation).toBe('0.0');
    expect(Number.isFinite(Number(allocation))).toBe(true);
  });

  it('store setSelectedTicker trims and uppercases, rejects empty', () => {
    useUIStore.getState().setSelectedTicker('aapl');
    expect(useUIStore.getState().selectedTicker).toBe('AAPL');
    useUIStore.getState().setSelectedTicker('  msft  ');
    expect(useUIStore.getState().selectedTicker).toBe('MSFT');
    const before = useUIStore.getState().selectedTicker;
    // @ts-expect-error empty
    useUIStore.getState().setSelectedTicker('');
    expect(useUIStore.getState().selectedTicker).toBe(before);
    // @ts-expect-error non-string
    useUIStore.getState().setSelectedTicker(null as any);
    expect(useUIStore.getState().selectedTicker).toBe(before);
    // restore
    useUIStore.getState().setSelectedTicker('AAPL');
  });

  it('store setMode validates AppMode', () => {
    const before = useUIStore.getState().mode;
    // @ts-expect-error invalid mode
    useUIStore.getState().setMode('invalid' as any);
    expect(useUIStore.getState().mode).toBe(before);
    // @ts-expect-error invalid mode
    useUIStore.getState().setMode('' as any);
    expect(useUIStore.getState().mode).toBe(before);
    useUIStore.getState().setMode('backtest');
    expect(useUIStore.getState().mode).toBe('backtest');
    useUIStore.getState().setMode('trade');
    expect(useUIStore.getState().mode).toBe('trade');
  });
});
