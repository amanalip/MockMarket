import { Trade, Position, BacktestTrade } from '../../model/types';
import { ETFPerformancePoint } from '../etf/etf-builder';

export function downloadCSV(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportTradesToCSV(trades: Trade[]): string {
  const headers = ['ID', 'Ticker', 'Side', 'Type', 'Shares', 'Price', 'Fee', 'Total', 'Timestamp'];
  const rows = trades.map((t) => [
    t.id,
    t.ticker,
    t.side.toUpperCase(),
    t.type.toUpperCase(),
    t.shares,
    t.price.toFixed(2),
    t.fee.toFixed(2),
    t.total.toFixed(2),
    t.timestamp,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportPositionsToCSV(positions: Record<string, Position>): string {
  const headers = ['Ticker', 'Shares', 'AvgCost', 'TotalCost', 'CurrentPrice', 'CurrentValue', 'UnrealizedPnL', 'UnrealizedPnLPercent', 'RealizedPnL'];
  const rows = Object.values(positions).map((p) => [
    p.ticker,
    p.shares,
    p.avgCost.toFixed(2),
    p.totalCost.toFixed(2),
    p.currentPrice.toFixed(2),
    p.currentValue.toFixed(2),
    p.unrealizedPnL.toFixed(2),
    p.unrealizedPnLPercent.toFixed(2),
    p.realizedPnL.toFixed(2),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportBacktestTradesToCSV(trades: BacktestTrade[]): string {
  const headers = ['ID', 'EntryDate', 'EntryPrice', 'ExitDate', 'ExitPrice', 'Shares', 'PnL', 'PnLPercent', 'Reason'];
  const rows = trades.map((t) => [
    t.id,
    t.entryDate,
    t.entryPrice.toFixed(2),
    t.exitDate,
    t.exitPrice.toFixed(2),
    t.shares,
    t.pnl.toFixed(2),
    t.pnlPercent.toFixed(2),
    `"${t.reason}"`,
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportETFNAVToCSV(navHistory: ETFPerformancePoint[], fundName: string): string {
  const headers = ['Date', `${fundName}_NAV`];
  const rows = navHistory.map((p) => [p.date, p.nav.toFixed(2)]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
