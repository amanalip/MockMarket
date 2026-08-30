import React from 'react';
import { usePortfolioStore, useUIStore } from '../../store';
import { getTickerInfo } from '../../model/tickers';
import styles from './PortfolioDashboard.module.css';

export const PortfolioDashboard: React.FC = () => {
  const { cash, positions, startingCash, trades } = usePortfolioStore();
  const { setSelectedTicker } = useUIStore();

  const holdingsList = Object.values(positions);
  const investedValue = holdingsList.reduce((sum, p) => sum + p.currentValue, 0);
  const totalPortfolioValue = cash + investedValue;

  const totalUnrealizedPnL = holdingsList.reduce((sum, p) => sum + p.unrealizedPnL, 0);
  const totalRealizedPnL = trades
    .filter((t) => t.side === 'sell')
    .reduce((sum, t) => sum + (t.total - t.fee), 0) -
    trades
      .filter((t) => t.side === 'buy')
      .reduce((sum, t) => sum + (t.total + t.fee), 0) +
    investedValue + cash - startingCash;

  const netReturnPercent = startingCash > 0 ? ((totalPortfolioValue - startingCash) / startingCash) * 100 : 0;
  const isNetPositive = totalPortfolioValue >= startingCash;

  return (
    <div className={styles.container}>
      <div className={styles.summaryCards}>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Portfolio Net Value</span>
          <span className={styles.cardValue}>${totalPortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className={`${styles.cardSub} ${isNetPositive ? styles.up : styles.down}`}>
            {isNetPositive ? '+' : ''}{netReturnPercent.toFixed(2)}% total return
          </span>
        </div>

        <div className={styles.card}>
          <span className={styles.cardLabel}>Available Cash</span>
          <span className={styles.cardValue}>${cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className={styles.cardSub}>
            {(totalPortfolioValue > 0 && Number.isFinite(cash) ? ((cash / totalPortfolioValue) * 100).toFixed(1) : '0.0')}% cash allocation
          </span>
        </div>

        <div className={styles.card}>
          <span className={styles.cardLabel}>Invested Holdings</span>
          <span className={styles.cardValue}>${investedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className={styles.cardSub}>{holdingsList.length} active position(s)</span>
        </div>

        <div className={styles.card}>
          <span className={styles.cardLabel}>Unrealized P&L</span>
          <span className={`${styles.cardValue} ${totalUnrealizedPnL >= 0 ? styles.up : styles.down}`}>
            {totalUnrealizedPnL >= 0 ? '+' : ''}${totalUnrealizedPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={styles.cardSub}>Open positions</span>
        </div>

        <div className={styles.card}>
          <span className={styles.cardLabel}>Realized P&L</span>
          <span className={`${styles.cardValue} ${totalRealizedPnL >= 0 ? styles.up : styles.down}`}>
            {totalRealizedPnL >= 0 ? '+' : ''}${totalRealizedPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={styles.cardSub}>Closed positions</span>
        </div>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Asset</th>
              <th>Shares</th>
              <th className={styles.numberCol}>Avg Cost</th>
              <th className={styles.numberCol}>Current Price</th>
              <th className={styles.numberCol}>Market Value</th>
              <th className={styles.numberCol}>Unrealized P&L</th>
              <th className={styles.numberCol}>% Gain / Loss</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {holdingsList.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.emptyState}>
                  No active holdings. Place a buy order from the stock screener or trade panel.
                </td>
              </tr>
            ) : (
              holdingsList.map((pos) => {
                const info = getTickerInfo(pos.ticker);
                const isPos = pos.unrealizedPnL >= 0;
                return (
                  <tr key={pos.ticker}>
                    <td>
                      <span
                        className={styles.tickerCode}
                        onClick={() => setSelectedTicker(pos.ticker)}
                      >
                        {pos.ticker}
                      </span>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {info?.name || ''}
                      </div>
                    </td>
                    <td>{pos.shares}</td>
                    <td className={styles.numberCol}>${pos.avgCost.toFixed(2)}</td>
                    <td className={styles.numberCol}>${pos.currentPrice.toFixed(2)}</td>
                    <td className={styles.numberCol}>${pos.currentValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className={`${styles.numberCol} ${isPos ? styles.up : styles.down}`}>
                      {isPos ? '+' : ''}${pos.unrealizedPnL.toFixed(2)}
                    </td>
                    <td className={`${styles.numberCol} ${isPos ? styles.up : styles.down}`}>
                      {isPos ? '+' : ''}{pos.unrealizedPnLPercent.toFixed(2)}%
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <button
                        className={styles.quickActionBtn}
                        onClick={() => setSelectedTicker(pos.ticker)}
                      >
                        Trade
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
