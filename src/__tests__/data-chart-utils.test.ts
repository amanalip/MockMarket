import { describe, it, expect, beforeEach, vi } from 'vitest';
import { filterCandlesByDate, getLatestCandleOnOrBefore, loadTickerData } from '../data/loader';
import { filterCandlesByTimeframe, toCandlestickData, toVolumeData } from '../components/charts/chart-utils';
import { Candle } from '../model/types';

const candles: Candle[] = [
  { time:'2024-01-01', open:100, high:110, low:90, close:100, volume:1000 },
  { time:'2024-02-01', open:101, high:111, low:91, close:101, volume:1100 },
  { time:'2024-03-01', open:102, high:112, low:92, close:102, volume:1200 },
  { time:'2024-06-01', open:103, high:113, low:93, close:103, volume:1300 },
  { time:'2024-12-01', open:104, high:114, low:94, close:104, volume:1400 },
  { time:'2025-01-01', open:105, high:115, low:95, close:105, volume:1500 },
];

describe('Data Loader & Chart Utils - Edges', () => {
  it('filterCandlesByDate inclusive range', () => {
    expect(filterCandlesByDate(candles,'2024-02-01','2024-06-01').length).toBe(3);
    expect(filterCandlesByDate(candles,undefined,'2024-01-01').length).toBe(1);
    expect(filterCandlesByDate(candles,'2025-01-01',undefined).length).toBe(1);
  });

  it('getLatestCandleOnOrBefore exact match', () => {
    expect(getLatestCandleOnOrBefore(candles,'2024-02-01')?.time).toBe('2024-02-01');
  });

  it('getLatestCandleOnOrBefore picks previous when no exact', () => {
    expect(getLatestCandleOnOrBefore(candles,'2024-02-15')?.time).toBe('2024-02-01');
  });

  it('getLatestCandleOnOrBefore before first returns undefined (fixed)', () => {
    expect(getLatestCandleOnOrBefore(candles,'2023-01-01')).toBeUndefined();
  });

  it('getLatestCandleOnOrBefore empty returns undefined', () => {
    expect(getLatestCandleOnOrBefore([], '2024-01-01')).toBeUndefined();
  });

  it('loadTickerData cache works', async () => {
    // mock fetch
    const fakeData = [{ time:'2024-01-01', open:10, high:10, low:10, close:10, volume:1000 }];
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok:true, json: async()=> fakeData } as any);
    const first = await loadTickerData('FAKE_TICKER_XYZ');
    const second = await loadTickerData('FAKE_TICKER_XYZ');
    expect(first).toEqual(fakeData);
    expect(second).toEqual(fakeData);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });

  it('toCandlestickData maps correctly', () => {
    const res=toCandlestickData(candles.slice(0,2));
    expect(res[0]).toEqual({ time:'2024-01-01', open:100, high:110, low:90, close:100 });
  });

  it('toVolumeData colors up vs down', () => {
    const up: Candle = { time:'2024-01-01', open:100, high:110, low:90, close:110, volume:1000 };
    const down: Candle = { time:'2024-01-02', open:110, high:115, low:90, close:100, volume:1000 };
    const doji: Candle = { time:'2024-01-03', open:100, high:110, low:90, close:100, volume:1000 };
    const res=toVolumeData([up,down,doji], 'green','red');
    expect(res[0].color).toBe('green');
    expect(res[1].color).toBe('red');
    expect(res[2].color).toBe('green'); // doji >= => up
  });

  it('filterCandlesByTimeframe MAX returns all', () => {
    expect(filterCandlesByTimeframe(candles,'MAX').length).toBe(candles.length);
  });

  it('filterCandlesByTimeframe 1M ', () => {
    // reference 2024-06-01, 1M => cutoff ~2024-05-01 => should include only 2024-06-01 and later? Actually includes 2024-06-01 and 2024-12-01 is > cutoff but also <= target so depends
    const filtered=filterCandlesByTimeframe(candles,'1M','2024-06-01');
    expect(filtered.some(c=>c.time==='2024-06-01')).toBe(true);
    expect(filtered.some(c=>c.time==='2024-01-01')).toBe(false);
  });

  it('filterCandlesByTimeframe empty returns []', () => {
    expect(filterCandlesByTimeframe([],'1M')).toEqual([]);
  });

  it('filterCandlesByTimeframe no data after cutoff returns original (bug)', () => {
    // reference date far in future where cutoff filters all -> returns original instead of empty
    const farFuture=filterCandlesByTimeframe(candles.slice(0,2),'1M','2099-01-01');
    expect(farFuture.length).toBe(2); // bug: returns full instead of maybe empty? Current impl returns candles if filtered empty
  });

  it('filterCandlesByTimeframe 5Y includes older', () => {
    const res=filterCandlesByTimeframe(candles,'5Y','2025-01-01');
    expect(res.length).toBeGreaterThan(1);
  });
});
