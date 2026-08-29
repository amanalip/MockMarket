import { describe, it, expect, vi } from 'vitest';
import { exportTradesToCSV, exportPositionsToCSV, exportBacktestTradesToCSV, exportETFNAVToCSV, downloadCSV } from '../engine/export/csv-export';
import { encodeShareState, decodeShareState, generateShareableLink } from '../engine/export/url-state';
import { Trade, Position } from '../model/types';

describe('Export Sharing Extended', () => {
  it('exportTradesToCSV header', () => {
    expect(exportTradesToCSV([])).toContain('ID,Ticker');
  });

  it('exportPositions header', () => {
    expect(exportPositionsToCSV({})).toContain('Ticker,Shares');
  });

  it('exportBacktest header', () => {
    expect(exportBacktestTradesToCSV([])).toContain('EntryDate');
  });

  it('exportETFNAV header with fund name', () => {
    expect(exportETFNAVToCSV([{ date: '2020-01-01', nav: 100 }], 'Fund')).toContain('Fund_NAV');
  });

  it('exportTrades row count', () => {
    const trades: Trade[] = [{ id: '1', ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, price: 100, total: 1000, fee: 0, timestamp: '2020-01-01' }];
    expect(exportTradesToCSV(trades).split('\n').length).toBe(2);
  });

  it('exportPositions row count', () => {
    const pos: Record<string, Position> = { AAPL: { ticker: 'AAPL', shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 100, currentValue: 1000, unrealizedPnL: 0, unrealizedPnLPercent: 0, realizedPnL: 0 } };
    expect(exportPositionsToCSV(pos).split('\n').length).toBe(2);
  });

  it('exportBacktest quotes reason', () => {
    const trades: any = [{ id: '1', entryDate: '2020-01-01', entryPrice: 100, exitDate: '2020-01-02', exitPrice: 110, shares: 10, pnl: 100, pnlPercent: 10, reason: 'Take Profit' }];
    expect(exportBacktestTradesToCSV(trades)).toContain('"Take Profit"');
  });

  it('exportETFNAV row count', () => {
    expect(exportETFNAVToCSV([{ date: '2020-01-01', nav: 100 }, { date: '2020-01-02', nav: 101 }], 'F').split('\n').length).toBe(3);
  });

  it('encodeShareState produces string', () => {
    expect(typeof encodeShareState({ version: 1 })).toBe('string');
  });

  it('decodeShareState roundtrip', () => {
    const p: any = { version: 1, mode: 'trade', ticker: 'AAPL' };
    expect(decodeShareState(encodeShareState(p))).toEqual(p);
  });

  it('decodeShareState invalid returns null', () => {
    expect(decodeShareState('!!!')).toBeNull();
  });

  it('generateShareableLink contains #share=', () => {
    expect(generateShareableLink({ version: 1 } as any)).toContain('#share=');
  });

  it('encode handles ETF', () => {
    const p: any = { version: 1, etf: { name: 'X', tickers: [{ ticker: 'AAPL', targetWeight: 100 }], rebalanceFrequency: 'never' } };
    expect(decodeShareState(encodeShareState(p))?.etf?.name).toBe('X');
  });

  it('encode handles backtest', () => {
    const p: any = { version: 1, backtest: { ticker: 'AAPL', entryRule: 'CLOSE > 100', exitRule: 'CLOSE < 100' } };
    expect(decodeShareState(encodeShareState(p))?.backtest?.ticker).toBe('AAPL');
  });

  it('exportTrades handles BRK.B', () => {
    const trades: Trade[] = [{ id: '1', ticker: 'BRK.B', side: 'buy', type: 'market', shares: 1, price: 500000, total: 500000, fee: 0, timestamp: '2020-01-01' }];
    expect(exportTradesToCSV(trades)).toContain('BRK.B');
  });

  it('exportPositions handles large numbers', () => {
    const pos: Record<string, Position> = { AAPL: { ticker: 'AAPL', shares: 1000, avgCost: 1000, totalCost: 1000000, currentPrice: 2000, currentValue: 2000000, unrealizedPnL: 1000000, unrealizedPnLPercent: 100, realizedPnL: 0 } };
    expect(exportPositionsToCSV(pos)).toContain('1000000');
  });

  it('downloadCSV mocks URL', () => {
    const origCreate = (URL as any).createObjectURL;
    const origRevoke = (URL as any).revokeObjectURL;
    (URL as any).createObjectURL = vi.fn().mockReturnValue('blob:fake');
    (URL as any).revokeObjectURL = vi.fn();
    const createEl = vi.spyOn(document, 'createElement');
    const click = vi.fn();
    createEl.mockReturnValue({ setAttribute: vi.fn(), style: {} as any, click } as any);
    const append = vi.spyOn(document.body, 'appendChild').mockImplementation(x => x as any);
    const remove = vi.spyOn(document.body, 'removeChild').mockImplementation(x => x as any);
    downloadCSV('a.csv', 'a,b');
    expect(click).toHaveBeenCalled();
    createEl.mockRestore(); append.mockRestore(); remove.mockRestore();
    (URL as any).createObjectURL = origCreate;
    (URL as any).revokeObjectURL = origRevoke;
  });

  it('encodeShareState handles special chars', () => {
    const p: any = { version: 1, backtest: { ticker: 'AAPL', entryRule: 'CLOSE < 100 && CLOSE > 50', exitRule: 'CLOSE > 200' } };
    expect(decodeShareState(encodeShareState(p))?.backtest?.entryRule).toBe('CLOSE < 100 && CLOSE > 50');
  });

  it('exportBacktest handles comma in reason', () => {
    const trades: any = [{ id: '1', entryDate: '2020-01-01', entryPrice: 100, exitDate: '2020-01-02', exitPrice: 110, shares: 10, pnl: 100, pnlPercent: 10, reason: 'Stop, Loss' }];
    expect(exportBacktestTradesToCSV(trades)).toContain('"Stop, Loss"');
  });

  it('encodeShareState version', () => {
    expect(decodeShareState(encodeShareState({ version: 5 } as any))?.version).toBe(5);
  });

  it('generateShareableLink window fallback', () => {
    const orig = (globalThis as any).window;
    (globalThis as any).window = undefined;
    expect(generateShareableLink({ version: 1 } as any)).toContain('mockmarket.app');
    (globalThis as any).window = orig;
  });

  it('exportTrades fee formatting', () => {
    const trades: Trade[] = [{ id: '1', ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, price: 100.123, total: 1001.23, fee: 4.95, timestamp: '2020-01-01' }];
    expect(exportTradesToCSV(trades)).toContain('100.12');
  });

  it('exportPositions unrealized percent', () => {
    const pos: Record<string, Position> = { AAPL: { ticker: 'AAPL', shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 150, currentValue: 1500, unrealizedPnL: 500, unrealizedPnLPercent: 50, realizedPnL: 0 } };
    expect(exportPositionsToCSV(pos)).toContain('50.00');
  });

  it('encodeShareState handles empty', () => {
    expect(decodeShareState(encodeShareState({ version: 1, mode: 'trade' } as any))?.mode).toBe('trade');
  });
});
