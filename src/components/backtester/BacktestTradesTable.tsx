import React from 'react';
import { BacktestTrade } from '../../model/types';

interface BacktestTradesTableProps {
  trades: BacktestTrade[];
}

export const BacktestTradesTable: React.FC<BacktestTradesTableProps> = ({ trades }) => {
  if (trades.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
        No trades generated in this backtest run.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
        Trade Execution Log ({trades.length} trades)
      </span>
      <div tabIndex={0} aria-label="Backtest trades table, horizontally scrollable" style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>#</th>
              <th style={{ padding: '8px 12px' }}>Entry Date</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>Entry Price</th>
              <th style={{ padding: '8px 12px' }}>Exit Date</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>Exit Price</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>Shares</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>P&L ($)</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>P&L (%)</th>
              <th style={{ padding: '8px 12px' }}>Exit Reason</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t, index) => {
              const isPos = t.pnl >= 0;
              return (
                <tr key={t.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '8px 12px' }}>{index + 1}</td>
                  <td style={{ padding: '8px 12px' }}>{t.entryDate}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>${t.entryPrice.toFixed(2)}</td>
                  <td style={{ padding: '8px 12px' }}>{t.exitDate}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>${t.exitPrice.toFixed(2)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{t.shares}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: isPos ? 'var(--up-green)' : 'var(--down-red)' }}>
                    {isPos ? '+' : ''}${t.pnl.toFixed(2)}
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: isPos ? 'var(--up-green)' : 'var(--down-red)' }}>
                    {isPos ? '+' : ''}{t.pnlPercent.toFixed(2)}%
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: t.reason === 'Stop Loss' ? 'rgba(239, 68, 68, 0.15)' : (t.reason === 'Take Profit' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-card)'),
                      color: t.reason === 'Stop Loss' ? 'var(--down-red)' : (t.reason === 'Take Profit' ? 'var(--up-green)' : 'var(--text-secondary)')
                    }}>
                      {t.reason}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
