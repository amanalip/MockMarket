import { describe, it, expect } from 'vitest';
import {
  exportTradesToCSV,
  exportPositionsToCSV,
  exportBacktestTradesToCSV,
  exportETFNAVToCSV,
} from '../engine/export/csv-export';
import {
  encodeShareState,
  decodeShareState,
  generateShareableLink,
  ShareableStatePayload,
} from '../engine/export/url-state';
import { Trade, Position, BacktestTrade } from '../model/types';

describe('Export & Sharing Engine', () => {
  it('generates well-formatted CSV strings for trades', () => {
    const trades: Trade[] = [
      {
        id: 'trade_1',
        ticker: 'AAPL',
        side: 'buy',
        type: 'market',
        shares: 10,
        price: 150.5,
        fee: 0,
        total: 1505,
        timestamp: '2024-01-02',
      },
    ];

    const csv = exportTradesToCSV(trades);
    expect(csv).toContain('ID,Ticker,Side,Type,Shares,Price,Fee,Total,Timestamp');
    expect(csv).toContain('trade_1,AAPL,BUY,MARKET,10,150.50,0.00,1505.00,2024-01-02');
  });

  it('generates well-formatted CSV strings for positions and ETF NAVs', () => {
    const positions: Record<string, Position> = {
      AAPL: {
        ticker: 'AAPL',
        shares: 10,
        avgCost: 150,
        totalCost: 1500,
        currentPrice: 160,
        currentValue: 1600,
        unrealizedPnL: 100,
        unrealizedPnLPercent: 6.67,
        realizedPnL: 0,
      },
    };

    const posCsv = exportPositionsToCSV(positions);
    expect(posCsv).toContain('AAPL,10,150.00,1500.00,160.00,1600.00,100.00,6.67,0.00');

    const etfCsv = exportETFNAVToCSV([{ date: '2024-01-02', nav: 100 }], 'TechFund');
    expect(etfCsv).toContain('Date,TechFund_NAV');
    expect(etfCsv).toContain('2024-01-02,100.00');
  });

  it('generates well-formatted CSV strings for backtest trades', () => {
    const bTrades: BacktestTrade[] = [
      {
        id: 'bt_1',
        entryDate: '2024-01-02',
        entryPrice: 100,
        exitDate: '2024-01-10',
        exitPrice: 110,
        shares: 50,
        pnl: 500,
        pnlPercent: 10,
        reason: 'Take Profit',
      },
    ];

    const bCsv = exportBacktestTradesToCSV(bTrades);
    expect(bCsv).toContain('ID,EntryDate,EntryPrice,ExitDate,ExitPrice,Shares,PnL,PnLPercent,Reason');
    expect(bCsv).toContain('Take Profit');
  });

  it('encodes and decodes shareable state payloads via URL hash', () => {
    const payload: ShareableStatePayload = {
      version: 1,
      mode: 'trade',
      ticker: 'NVDA',
      date: '2024-01-02',
      cash: 100000,
    };

    const encoded = encodeShareState(payload);
    expect(encoded.length).toBeGreaterThan(10);

    const decoded = decodeShareState(encoded);
    expect(decoded).toEqual(payload);

    const link = generateShareableLink(payload);
    expect(link).toContain('#share=');
  });
});
