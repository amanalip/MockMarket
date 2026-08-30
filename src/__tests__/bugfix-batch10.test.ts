import { describe, it, expect } from 'vitest';
import { filterCandlesByDate } from '../data/loader';
import { useUIStore, useScenarioStore, useETFStore } from '../store';
import { getAllScenarios, filterScenarios } from '../data/scenario-loader';
import { Candle } from '../model/types';

const mkCandles = (dates: string[]): Candle[] => dates.map(d => ({ time: d, open: 100, high: 100, low: 100, close: 100, volume: 1000 }));

describe('Bugfix Batch 10 – Data/Store hardening', () => {
  it('filterCandlesByDate ignores invalid dates', () => {
    const candles = mkCandles(['2024-01-01', '2024-02-01', '2024-03-01']);
    // invalid start should not filter
    expect(filterCandlesByDate(candles, 'not-a-date', '2024-12-31').length).toBe(3);
    expect(filterCandlesByDate(candles, '2024-13-01', '2024-12-31').length).toBe(3); // invalid month
    expect(filterCandlesByDate(candles, '2024-02-30', '2024-12-31').length).toBe(3); // overflow
    // valid filter still works
    expect(filterCandlesByDate(candles, '2024-02-01', '2024-02-01').length).toBe(1);
    expect(filterCandlesByDate(candles, '2024-01-01', '2024-01-01').length).toBe(1);
    // handles null candle time
    const bad: any = [{ time: null, open: 1, high: 1, low: 1, close: 1, volume: 1 }, ...candles];
    expect(filterCandlesByDate(bad as any, '2024-01-01', '2024-12-31').length).toBe(3);
  });

  it('setSimulationDate validates ISO and overflow', () => {
    const orig = useUIStore.getState().simulationDate;
    useUIStore.getState().setSimulationDate('invalid');
    expect(useUIStore.getState().simulationDate).toBe(orig);
    useUIStore.getState().setSimulationDate('2024-02-30');
    expect(useUIStore.getState().simulationDate).toBe(orig);
    useUIStore.getState().setSimulationDate(' 2024-01-01 ');
    expect(useUIStore.getState().simulationDate).toBe(orig); // needs exact YYYY-MM-DD
    useUIStore.getState().setSimulationDate('2024-01-15');
    expect(useUIStore.getState().simulationDate).toBe('2024-01-15');
    // restore
    useUIStore.getState().setSimulationDate(orig);
  });

  it('setCurrentStepIndex clamps negative/NaN/Infinity', () => {
    useScenarioStore.getState().setCurrentStepIndex(2);
    expect(useScenarioStore.getState().currentStepIndex).toBe(2);
    useScenarioStore.getState().setCurrentStepIndex(-5 as any);
    expect(useScenarioStore.getState().currentStepIndex).toBe(2); // unchanged
    useScenarioStore.getState().setCurrentStepIndex(NaN as any);
    expect(useScenarioStore.getState().currentStepIndex).toBe(2);
    useScenarioStore.getState().setCurrentStepIndex(Infinity as any);
    expect(useScenarioStore.getState().currentStepIndex).toBe(2);
    useScenarioStore.getState().setCurrentStepIndex(1.5 as any);
    expect(useScenarioStore.getState().currentStepIndex).toBe(2); // non-integer rejected
    useScenarioStore.getState().setCurrentStepIndex(5);
    expect(useScenarioStore.getState().currentStepIndex).toBe(5);
  });

  it('ETF store saveETF deep copy prevents external mutation', () => {
    const store = useETFStore.getState();
    const obj: any = { id: 'test-id-123', name: 'Original', description: 'd', tickers: [{ ticker: 'AAPL', targetWeight: 100 }], rebalanceFrequency: 'never', createdAt: '2024-01-01' };
    store.saveETF(obj);
    obj.name = 'Mutated';
    obj.tickers[0].targetWeight = 999;
    const saved = useETFStore.getState().savedETFs.find(e => e.id === 'test-id-123')!;
    expect(saved.name).toBe('Original');
    expect(saved.tickers[0].targetWeight).toBe(100);
    // cleanup
    useETFStore.getState().deleteETF('test-id-123');
  });

  it('scenario-loader returns deep copies', () => {
    const all1 = getAllScenarios();
    const len1 = all1.length;
    const firstTitle = all1[0].title;
    all1[0].title = 'HACKED';
    all1[0].steps[0].title = 'HACKED STEP';
    const all2 = getAllScenarios();
    expect(all2[0].title).toBe(firstTitle);
    expect(all2[0].steps[0].title).not.toBe('HACKED STEP');
    expect(all2.length).toBe(len1);
    // filterScenarios also deep
    const filtered = filterScenarios('Crash', 'all');
    if (filtered.length > 0) {
      const fTitle = filtered[0].title;
      filtered[0].title = 'HACKED2';
      expect(filterScenarios('Crash', 'all')[0].title).toBe(fTitle);
    }
  });
});
