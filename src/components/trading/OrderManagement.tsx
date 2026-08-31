import React from 'react';
import { usePortfolioStore, useUIStore } from '../../store';
import styles from './OrderManagement.module.css';

export const OrderManagement: React.FC = () => {
  const { orders, cancelOrder } = usePortfolioStore();
  const { addToast } = useUIStore();

  const handleCancel = (orderId: string, ticker: string) => {
    cancelOrder(orderId);
    addToast(`Cancelled open order for ${ticker}.`, 'info');
  };

  const getStatusBadge = (status: string) => {
    if (status === 'filled') return styles.badgeFilled;
    if (status !== 'pending') return styles.badgeCancelled;
    return styles.badgePending;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Working Orders ({orders.length})</span>
      </div>

      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Placed Date</th>
              <th>Ticker</th>
              <th>Side</th>
              <th>Type</th>
              <th className={styles.numberCol}>Shares</th>
              <th className={styles.numberCol}>Target Price</th>
              <th style={{ textAlign: 'center' }}>Status</th>
              <th style={{ textAlign: 'center' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} className={styles.emptyState}>
                  No active or historical conditional orders.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const targetPrice = order.limitPrice || order.stopPrice || 0;
                return (
                  <tr key={order.id}>
                    <td>{order.createdAt}</td>
                    <td><strong>{order.ticker}</strong></td>
                    <td style={{ textTransform: 'uppercase', fontWeight: 600 }}>{order.side}</td>
                    <td>{order.type.replace('_', ' ')}</td>
                    <td className={styles.numberCol}>{order.shares}</td>
                    <td className={styles.numberCol}>${targetPrice.toFixed(2)}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={getStatusBadge(order.status)}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {order.status === 'pending' && (
                        <button
                          className={styles.cancelBtn}
                          onClick={() => handleCancel(order.id, order.ticker)}
                        >
                          Cancel
                        </button>
                      )}
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
