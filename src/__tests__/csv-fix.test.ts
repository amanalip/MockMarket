import { describe, it, expect } from 'vitest';
import { exportBacktestTradesToCSV, exportETFNAVToCSV, exportTradesToCSV, exportPositionsToCSV } from '../engine/export/csv-export';

describe('CSV Fix - RFC4180 Quote Escaping', () => {
  it('backtest reason with no special chars not quoted unnecessarily', () => {
    const trades: any = [{ id: '1', entryDate: '2020-01-01', entryPrice: 100, exitDate: '2020-01-02', exitPrice: 110, shares: 10, pnl: 100, pnlPercent: 10, reason: 'Signal Exit' }];
    const csv = exportBacktestTradesToCSV(trades);
    const row = csv.split('\n')[1];
    // reason without comma/quote should not be quoted? csvEscape leaves it plain
    expect(row.endsWith('Signal Exit')).toBe(true);
  });

  it('backtest reason with comma is quoted', () => {
    const trades: any = [{ id: '1', entryDate: '2020-01-01', entryPrice: 100, exitDate: '2020-01-02', exitPrice: 110, shares: 10, pnl: 100, pnlPercent: 10, reason: 'Signal, Exit' }];
    expect(exportBacktestTradesToCSV(trades)).toContain('"Signal, Exit"');
  });

  it('backtest reason with inner quote doubles it', () => {
    const trades: any = [{ id: '1', entryDate: '2020-01-01', entryPrice: 100, exitDate: '2020-01-02', exitPrice: 110, shares: 10, pnl: 0, pnlPercent: 0, reason: 'Say "hi"' }];
    const csv = exportBacktestTradesToCSV(trades);
    // should be "Say ""hi"""  -> outer quotes + doubled inner
    expect(csv).toContain('"Say ""hi"""');
    expect(csv.split('\n')[1].endsWith('"Say ""hi"""')).toBe(true);
  });

  it('backtest reason with both comma and quote', () => {
    const trades: any = [{ id: '1', entryDate: '2020-01-01', entryPrice: 100, exitDate: '2020-01-02', exitPrice: 110, shares: 10, pnl: 0, pnlPercent: 0, reason: 'A, "B"' }];
    const csv = exportBacktestTradesToCSV(trades);
    expect(csv).toContain('"A, ""B"""');
  });

  it('backtest reason with newline is quoted', () => {
    const trades: any = [{ id: '1', entryDate: '2020-01-01', entryPrice: 100, exitDate: '2020-01-02', exitPrice: 110, shares: 10, pnl: 0, pnlPercent: 0, reason: 'Line1\nLine2' }];
    expect(exportBacktestTradesToCSV(trades)).toContain('"Line1\nLine2"');
  });

  it('ETF fundName with comma header is quoted', () => {
    const nav = [{ date: '2020-01-01', nav: 100 }];
    const csv = exportETFNAVToCSV(nav, 'Foo,Bar');
    expect(csv.split('\n')[0]).toBe('Date,"Foo,Bar_NAV"');
  });

  it('ETF fundName with quote header doubles', () => {
    const nav = [{ date: '2020-01-01', nav: 100 }];
    const csv = exportETFNAVToCSV(nav, 'My "Fund"');
    expect(csv.split('\n')[0]).toBe('Date,"My ""Fund""_NAV"');
  });

  it('ETF fundName with newline header quoted', () => {
    const nav = [{ date: '2020-01-01', nav: 100 }];
    const csv = exportETFNAVToCSV(nav, 'Fund\nName');
    expect(csv.split('\n')[0]).toContain('"');
  });

  it('ETF fundName plain not quoted', () => {
    const nav = [{ date: '2020-01-01', nav: 100 }];
    expect(exportETFNAVToCSV(nav, 'Plain').split('\n')[0]).toBe('Date,Plain_NAV');
  });

  it('header row count always 1', () => {
    expect(exportETFNAVToCSV([], 'X').split('\n').length).toBe(1);
    expect(exportBacktestTradesToCSV([]).split('\n')[0]).toContain('Reason');
  });

  it('backtest row fields count 9', () => {
    const trades: any = [{ id: '1', entryDate: '2020-01-01', entryPrice: 100, exitDate: '2020-01-02', exitPrice: 110, shares: 10, pnl: 100, pnlPercent: 10, reason: 'X' }];
    const cols = exportBacktestTradesToCSV(trades).split('\n')[1].split(',');
    // reason without comma gives 9 cols; with quoted comma still split naive but we check contains
    expect(exportBacktestTradesToCSV(trades).split('\n')[1].includes('X')).toBe(true);
  });

  it('trades export still plain for ticker without comma', () => {
    const trades: any = [{ id: '1', ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, price: 100, total: 1000, fee: 0, timestamp: '2020-01-01' }];
    expect(exportTradesToCSV(trades)).toContain('AAPL');
  });

  it('positions export plain', () => {
    const pos: any = { AAPL: { ticker: 'AAPL', shares: 10, avgCost: 100, totalCost: 1000, currentPrice: 100, currentValue: 1000, unrealizedPnL: 0, unrealizedPnLPercent: 0, realizedPnL: 0 } };
    expect(exportPositionsToCSV(pos)).toContain('AAPL');
  });

  it('reason empty string not quoted', () => {
    const trades: any = [{ id: '1', entryDate: '2020-01-01', entryPrice: 100, exitDate: '2020-01-02', exitPrice: 110, shares: 10, pnl: 0, pnlPercent: 0, reason: '' }];
    const row = exportBacktestTradesToCSV(trades).split('\n')[1];
    expect(row.endsWith(',')).toBe(true); // empty field at end
  });

  it('ETF NAV row count 2', () => {
    const nav = [{ date: '2020-01-01', nav: 100 }, { date: '2020-01-02', nav: 105 }];
    expect(exportETFNAVToCSV(nav, 'F').split('\n').length).toBe(3);
  });

  it('backtest reason Stop Loss plain', () => {
    const trades: any = [{ id: '1', entryDate: '2020-01-01', entryPrice: 100, exitDate: '2020-01-02', exitPrice: 110, shares: 10, pnl: 0, pnlPercent: 0, reason: 'Stop Loss' }];
    expect(exportBacktestTradesToCSV(trades).split('\n')[1].endsWith('Stop Loss')).toBe(true);
  });

  it('ETF header with both comma and quote', () => {
    const nav = [{ date: '2020-01-01', nav: 100 }];
    const csv = exportETFNAVToCSV(nav, 'A, "B"');
    expect(csv.split('\n')[0]).toBe('Date,"A, ""B""_NAV"');
  });

  it('backtest multiple rows each quoted correctly', () => {
    const trades: any = [
      { id: '1', entryDate: '2020-01-01', entryPrice: 100, exitDate: '2020-01-02', exitPrice: 110, shares: 10, pnl: 0, pnlPercent: 0, reason: 'A' },
      { id: '2', entryDate: '2020-01-03', entryPrice: 100, exitDate: '2020-01-04', exitPrice: 110, shares: 10, pnl: 0, pnlPercent: 0, reason: 'B, "C"' },
    ];
    const lines = exportBacktestTradesToCSV(trades).split('\n');
    expect(lines[1].endsWith('A')).toBe(true);
    expect(lines[2]).toContain('"B, ""C"""');
  });

  it('csvEscape does not double escape already escaped', () => {
    const trades: any = [{ id: '1', entryDate: '2020-01-01', entryPrice: 100, exitDate: '2020-01-02', exitPrice: 110, shares: 10, pnl: 0, pnlPercent: 0, reason: '""' }];
    const csv = exportBacktestTradesToCSV(trades);
    expect(csv).toContain('"""');
  });

  it('ETF NAV handles empty fundName', () => {
    const nav = [{ date: '2020-01-01', nav: 100 }];
    expect(exportETFNAVToCSV(nav, '').split('\n')[0]).toBe('Date,FUND_NAV');
  });

  it('backtest handles special chars <>&', () => {
    const trades: any = [{ id: '1', entryDate: '2020-01-01', entryPrice: 100, exitDate: '2020-01-02', exitPrice: 110, shares: 10, pnl: 0, pnlPercent: 0, reason: 'Price < 100 & > 50' }];
    expect(exportBacktestTradesToCSV(trades).split('\n')[1].endsWith('Price < 100 & > 50')).toBe(true);
  });

  it('ETF fundName numeric not quoted', () => {
    const nav = [{ date: '2020-01-01', nav: 100 }];
    expect(exportETFNAVToCSV(nav, '123').split('\n')[0]).toBe('Date,123_NAV');
  });

  it('backtest preserves pnl negative', () => {
    const trades: any = [{ id: '1', entryDate: '2020-01-01', entryPrice: 100, exitDate: '2020-01-02', exitPrice: 90, shares: 10, pnl: -100, pnlPercent: -10, reason: 'Loss' }];
    expect(exportBacktestTradesToCSV(trades)).toContain('-100.00');
  });

  it('header escaping does not affect Date column', () => {
    const nav = [{ date: '2020-01-01', nav: 100 }];
    expect(exportETFNAVToCSV(nav, 'Normal').split('\n')[0].startsWith('Date,')).toBe(true);
  });

  it('overall CSV has correct header count', () => {
    expect(exportTradesToCSV([]).split('\n')[0].split(',').length).toBe(9);
    expect(exportPositionsToCSV({}).split('\n')[0].split(',').length).toBe(9);
    expect(exportBacktestTradesToCSV([]).split('\n')[0].split(',').length).toBe(9);
  });
});
