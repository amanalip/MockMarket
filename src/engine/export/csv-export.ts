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
    csvEscape(String(t.id)),
    csvEscape(String(t.ticker)),
    csvEscape(String(t.side).toUpperCase()),
    csvEscape(String(t.type).toUpperCase()),
    String(t.shares),
    Number.isFinite(t.price) ? t.price.toFixed(2) : '0.00',
    Number.isFinite(t.fee) ? t.fee.toFixed(2) : '0.00',
    Number.isFinite(t.total) ? t.total.toFixed(2) : '0.00',
    csvEscape(String(t.timestamp)),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportPositionsToCSV(positions: Record<string, Position>): string {
  const headers = ['Ticker', 'Shares', 'AvgCost', 'TotalCost', 'CurrentPrice', 'CurrentValue', 'UnrealizedPnL', 'UnrealizedPnLPercent', 'RealizedPnL'];
  const rows = Object.values(positions).map((p) => [
    csvEscape(String(p.ticker)),
    String(p.shares),
    Number.isFinite(p.avgCost) ? p.avgCost.toFixed(2) : '0.00',
    Number.isFinite(p.totalCost) ? p.totalCost.toFixed(2) : '0.00',
    Number.isFinite(p.currentPrice) ? p.currentPrice.toFixed(2) : '0.00',
    Number.isFinite(p.currentValue) ? p.currentValue.toFixed(2) : '0.00',
    Number.isFinite(p.unrealizedPnL) ? p.unrealizedPnL.toFixed(2) : '0.00',
    Number.isFinite(p.unrealizedPnLPercent) ? p.unrealizedPnLPercent.toFixed(2) : '0.00',
    Number.isFinite(p.realizedPnL) ? p.realizedPnL.toFixed(2) : '0.00',
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

function csvEscape(field: string): string {
  if (field.includes('"') || field.includes(',') || field.includes('\n') || field.includes('\r')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function exportBacktestTradesToCSV(trades: BacktestTrade[]): string {
  const headers = ['ID', 'EntryDate', 'EntryPrice', 'ExitDate', 'ExitPrice', 'Shares', 'PnL', 'PnLPercent', 'Reason'];
  const rows = trades.map((t) => [
    csvEscape(String(t.id)),
    csvEscape(String(t.entryDate)),
    Number.isFinite(t.entryPrice) ? t.entryPrice.toFixed(2) : '0.00',
    csvEscape(String(t.exitDate)),
    Number.isFinite(t.exitPrice) ? t.exitPrice.toFixed(2) : '0.00',
    String(t.shares),
    Number.isFinite(t.pnl) ? t.pnl.toFixed(2) : '0.00',
    Number.isFinite(t.pnlPercent) ? t.pnlPercent.toFixed(2) : '0.00',
    csvEscape(String(t.reason)),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

export function exportETFNAVToCSV(navHistory: ETFPerformancePoint[], fundName: string): string {
  const safeName = typeof fundName === 'string' && fundName.trim() ? fundName.trim() : 'FUND';
  const headers = ['Date', csvEscape(`${safeName}_NAV`)];
  const safeHistory = Array.isArray(navHistory) ? navHistory : [];
  const rows = safeHistory.map((p) => [csvEscape(String(p?.date ?? '')), Number.isFinite(p?.nav) ? (p.nav as number).toFixed(2) : '0.00']);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}
