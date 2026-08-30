import { describe, it, expect } from 'vitest';
import { getLatestCandleOnOrBefore } from '../data/loader';
import { tokenize, validateRule } from '../parser/strategy-dsl';
import { exportTradesToCSV, exportPositionsToCSV, exportBacktestTradesToCSV } from '../engine/export/csv-export';
import { encodeShareState, decodeShareState } from '../engine/export/url-state';
import { simulateETF } from '../engine/etf/etf-builder';
import { Candle } from '../model/types';

const mkCandles = (dates: string[]): Candle[] => dates.map(d => ({ time: d, open: 100, high: 100, low: 100, close: 100, volume: 1000 }));

describe('Bugfix Batch 13 – Loader/Parser/Export/ETF', () => {
  it('getLatestCandleOnOrBefore guards invalid date', () => {
    const candles = mkCandles(['2024-01-01', '2024-01-02', '2024-01-10']);
    expect(getLatestCandleOnOrBefore(candles, 'invalid' as any)).toBeUndefined();
    expect(getLatestCandleOnOrBefore(candles, '2024-02-30' as any)).toBeUndefined();
    expect(getLatestCandleOnOrBefore(candles, '' as any)).toBeUndefined();
    expect(getLatestCandleOnOrBefore(candles, '2024-01-05')).toEqual(candles[1]);
    expect(getLatestCandleOnOrBefore(null as any, '2024-01-01')).toBeUndefined();
  });

  it('parser handles negative numbers', () => {
    expect(() => tokenize('-100')).not.toThrow();
    expect(tokenize('-100')[0].value).toBe('-100');
    expect(validateRule('PRICE > -100').valid).toBe(true);
    expect(validateRule('RSI(14) < -5').valid).toBe(true);
    expect(tokenize(' -5.5 ')[0].value).toBe('-5.5');
  });

  it('csv export guards null/undefined input', () => {
    expect(() => exportTradesToCSV(null as any)).not.toThrow();
    expect(exportTradesToCSV(null as any)).toBe('ID,Ticker,Side,Type,Shares,Price,Fee,Total,Timestamp');
    expect(() => exportPositionsToCSV(null as any)).not.toThrow();
    expect(exportPositionsToCSV(null as any)).toBe('Ticker,Shares,AvgCost,TotalCost,CurrentPrice,CurrentValue,UnrealizedPnL,UnrealizedPnLPercent,RealizedPnL');
    expect(() => exportBacktestTradesToCSV(undefined as any)).not.toThrow();
    expect(exportBacktestTradesToCSV(undefined as any)).toBe('ID,EntryDate,EntryPrice,ExitDate,ExitPrice,Shares,PnL,PnLPercent,Reason');
  });

  it('url-state decode validates prototype pollution and Infinity', () => {
    // Infinity cash should be rejected
    const payload: any = { version: 1, ticker: 'AAPL', cash: Infinity };
    const encoded = encodeShareState(payload);
    const decoded = decodeShareState(encoded);
    expect(decoded).toBeNull(); // Infinity not finite

    // prototype pollution
    const polluted = encodeURIComponent(Buffer.from('{"version":1,"__proto__":{"polluted":1}}').toString('base64'));
    // decode should not pollute and should return null or filtered
    const res = decodeShareState(polluted);
    expect((Object.prototype as any).polluted).toBeUndefined();
    // valid version 99 should still decode (finite)
    const goodVer = encodeShareState({ version: 99 as any, ticker: 'AAPL' });
    expect(decodeShareState(goodVer)?.version).toBe(99);
    // Infinity version should be rejected
    const badVerInf = encodeShareState({ version: Infinity as any, ticker: 'AAPL' });
    expect(decodeShareState(badVerInf)).toBeNull();
  });

  it('etf duplicate ticker deduped', () => {
    const mk = (price: number): Candle[] => mkCandles(['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05']).map(c => ({ ...c, close: price, open: price, high: price, low: price }));
    const map: Record<string, Candle[]> = { AAPL: mk(100) };
    const cfg: any = { id: 'test', name: 'Dup', tickers: [{ ticker: 'AAPL', targetWeight: 50 }, { ticker: 'AAPL', targetWeight: 50 }], rebalanceFrequency: 'never' };
    const res = simulateETF(cfg, map);
    // should dedupe to single ticker with 100 weight, NAV should be 100 at start and evolve normally
    expect(res.config.tickers.length).toBe(1);
    expect(res.config.tickers[0].ticker).toBe('AAPL');
    expect(res.config.tickers[0].targetWeight).toBe(100);
    expect(res.navHistory[0].nav).toBe(100);
  });
});
