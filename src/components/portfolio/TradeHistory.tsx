import React from 'react';
import { usePortfolioStore } from '../../store';
import styles from './TradeHistory.module.css';

export const TradeHistory: React.FC = () => {
  const { trades } = usePortfolioStore();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Execution Log ({trades.length})</span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Action</th>
              <th>Ticker</th>
              <th className={styles.numberCol}>Shares</th>
              <th className={styles.numberCol}>Price</th>
              <th className={styles.numberCol}>Total Value</th>
              <th className={styles.numberCol}>Fee</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 ? (
              <tr>
                <td colSpan={7} className={styles.emptyState}>
                  No trades executed yet.
                </td>
              </tr>
            ) : (
              trades.map((t) => (
                <tr key={t.id}>
                  <td>{t.timestamp}</td>
                  <td>
                    <span className={t.side === 'buy' ? styles.badgeBuy : styles.badgeSell}>
                      {t.side}
                    </span>
                  </td>
                  <td><strong>{t.ticker}</strong></td>
                  <td className={styles.numberCol}>{t.shares}</td>
                  <td className={styles.numberCol}>${t.price.toFixed(2)}</td>
                  <td className={styles.numberCol}>${t.total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className={styles.numberCol}>${t.fee.toFixed(2)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
