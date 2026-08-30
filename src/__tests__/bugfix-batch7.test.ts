import { describe, it, expect, vi } from 'vitest';
import { normalizeWeights } from '../engine/etf/etf-builder';
import { calculateTrackingError } from '../engine/etf/tracking-error';
import { getAllScenarios, getScenarioById } from '../data/scenario-loader';
import { filterNewsEvents, getAllHistoricalNews } from '../data/news-loader';
import { loadTickerData, clearTickerCache } from '../data/loader';
import { Candle } from '../model/types';

describe('Bugfix Batch 7 – ETF, Scenario, News, Loader', () => {
  it('normalizeWeights clamps negative weights to 0', () => {
    const res = normalizeWeights([{ ticker: 'AAPL', targetWeight: -10 }, { ticker: 'MSFT', targetWeight: 110 }]);
    expect(res.find(r => r.ticker === 'AAPL')!.targetWeight).toBe(0);
    expect(res.find(r => r.ticker === 'MSFT')!.targetWeight).toBe(100);
    expect(res.reduce((s, t) => s + t.targetWeight, 0)).toBeCloseTo(100, 2);
    // all negative -> equal distribution
    const allNeg = normalizeWeights([{ ticker: 'A', targetWeight: -5 }, { ticker: 'B', targetWeight: -5 }]);
    expect(allNeg[0].targetWeight).toBe(50);
    expect(allNeg[1].targetWeight).toBe(50);
  });

  it('trackingError handles NaN and length mismatch after batch3 volatility fix', () => {
    // custom has NaN, should return 0 rather than misaligned diff
    const custom = [100, NaN as any, 110, 115, 120];
    const bench = [100, 101, 102, 103, 104];
    const res = calculateTrackingError(custom, bench);
    expect(res.trackingErrorPercent).toBe(0);
    expect(res.correlation).toBe(0);
    // slice-only check: corrupt beyond n should not affect
    const longCustom = [100, 101, 102, 103, 104, NaN as any, NaN as any];
    const shortBench = [100, 101, 102, 103, 104];
    const res2 = calculateTrackingError(longCustom, shortBench);
    // n=5, slice 0..5 has no NaN, should compute normally
    expect(res2.trackingErrorPercent).toBe(0); // identical 100..104 vs 100..104
  });

  it('scenario-loader returns copies, mutation does not pollute', () => {
    const all1 = getAllScenarios();
    const len1 = all1.length;
    (all1 as any).push({ id: 'FAKE', title: 'hack' } as any);
    const all2 = getAllScenarios();
    expect(all2.length).toBe(len1);
    expect(all2.find(s => s.id === 'FAKE')).toBeUndefined();
    const sc = getScenarioById(all1[0].id)!;
    const originalTitle = sc.title;
    sc.title = 'mutated';
    sc.steps[0].title = 'mutated step';
    const sc2 = getScenarioById(all1[0].id)!;
    expect(sc2.title).toBe(originalTitle);
    expect(sc2.steps[0].title).not.toBe('mutated step');
  });

  it('news-loader guards null/undefined and malformed items', () => {
    expect(() => filterNewsEvents(null as any, null as any)).not.toThrow();
    expect(filterNewsEvents(null as any, null as any)).toEqual([]);
    // malformed item
    const malformed: any = [{ headline: null, summary: null, affectedTickers: null, category: null, sentiment: null, date: '2024-01-01' }];
    expect(() => filterNewsEvents(malformed, { query: 'a' } as any)).not.toThrow();
    expect(filterNewsEvents(malformed, { query: 'a' } as any)).toEqual([]);
    // valid filter still works
    const all = getAllHistoricalNews();
    const filtered = filterNewsEvents(all, { query: 'a' });
    expect(Array.isArray(filtered)).toBe(true);
    // options null should return copy of events
    expect(filterNewsEvents(all, null as any).length).toBe(all.length);
    // getAll returns copy
    const h1 = getAllHistoricalNews();
    (h1 as any).push({ headline: 'fake' } as any);
    expect(getAllHistoricalNews().length).toBe(all.length);
  });

  it('loader path traversal blocked and data validation', async () => {
    clearTickerCache();
    await expect(loadTickerData('../../package.json' as any)).rejects.toThrow(/Data file not found/);
    await expect(loadTickerData('..\\windows' as any)).rejects.toThrow(/Data file not found/);
    await expect(loadTickerData('' as any)).rejects.toThrow(/Data file not found/);
    // mock fetch returning invalid json (close is string)
    const origFetch = globalThis.fetch;
    const fetchSpy = vi.fn(async () => ({ ok: true, json: async () => [{ time: '2024-01-01', close: 'bad' }] } as any));
    (globalThis as any).fetch = fetchSpy;
    clearTickerCache();
    await expect(loadTickerData('TESTBAD')).rejects.toThrow(/Data file not found/);
    (globalThis as any).fetch = origFetch;
    clearTickerCache();
  });
});
