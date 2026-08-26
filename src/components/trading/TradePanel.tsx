import React, { useState } from 'react';
import { useUIStore, usePortfolioStore } from '../../store';
import { Candle, OrderSide } from '../../model/types';
import styles from './TradePanel.module.css';

interface TradePanelProps {
  currentCandle?: Candle;
}

export const TradePanel: React.FC<TradePanelProps> = ({ currentCandle }) => {
  const { selectedTicker, simulationDate, addToast } = useUIStore();
  const { cash, positions, executeTrade } = usePortfolioStore();

  const [side, setSide] = useState<OrderSide>('buy');
  const [sharesInput, setSharesInput] = useState<string>('10');

  const currentPrice = currentCandle?.close || 0;
  const currentPosition = positions[selectedTicker];
  const ownedShares = currentPosition?.shares || 0;

  const parsedShares = parseInt(sharesInput, 10) || 0;
  const estimatedTotal = parsedShares * currentPrice;

  const handlePercentageClick = (percent: number) => {
    if (currentPrice <= 0) return;
    if (side === 'buy') {
      const maxShares = Math.floor(cash / currentPrice);
      const target = Math.max(1, Math.floor(maxShares * (percent / 100)));
      setSharesInput(String(target));
    } else {
      const target = Math.max(1, Math.floor(ownedShares * (percent / 100)));
      setSharesInput(String(target));
    }
  };

  const handleTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCandle || currentPrice <= 0) {
      addToast('No candle data available for trade execution.', 'error');
      return;
    }

    if (parsedShares <= 0) {
      addToast('Please specify a positive number of shares.', 'error');
      return;
    }

    if (side === 'buy' && estimatedTotal > cash) {
      addToast('Insufficient cash available for this purchase.', 'error');
      return;
    }

    if (side === 'sell' && parsedShares > ownedShares) {
      addToast(`Cannot sell ${parsedShares} shares. You currently own ${ownedShares}.`, 'error');
      return;
    }

    const result = executeTrade(
      {
        ticker: selectedTicker,
        side,
        type: 'market',
        shares: parsedShares,
        date: simulationDate,
      },
      currentCandle
    );

    if (result.success) {
      if (side === 'buy') {
        addToast(
          `Bought ${parsedShares} shares of ${selectedTicker} at $${currentPrice.toFixed(2)}`,
          'success'
        );
      } else {
        const pnlStr = result.realizedPnL !== undefined
          ? ` (P&L: ${result.realizedPnL >= 0 ? '+' : ''}$${result.realizedPnL.toFixed(2)})`
          : '';
        addToast(
          `Sold ${parsedShares} shares of ${selectedTicker} at $${currentPrice.toFixed(2)}${pnlStr}`,
          'success'
        );
      }
    } else {
      addToast(result.error || 'Failed to execute trade.', 'error');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Order Placement</span>
        <span className={styles.cashBalance}>Available: ${cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
      </div>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${side === 'buy' ? styles.tabBuyActive : ''}`}
          onClick={() => setSide('buy')}
        >
          Buy {selectedTicker}
        </button>
        <button
          type="button"
          className={`${styles.tab} ${side === 'sell' ? styles.tabSellActive : ''}`}
          onClick={() => setSide('sell')}
        >
          Sell {selectedTicker}
        </button>
      </div>

      <form onSubmit={handleTrade} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Shares</label>
          <div className={styles.inputGroup}>
            <input
              type="number"
              min="1"
              step="1"
              className={styles.input}
              value={sharesInput}
              onChange={(e) => setSharesInput(e.target.value)}
              placeholder="Number of shares"
            />
          </div>
        </div>

        <div className={styles.percentageShortcuts}>
          <button type="button" className={styles.shortcutBtn} onClick={() => handlePercentageClick(25)}>
            25%
          </button>
          <button type="button" className={styles.shortcutBtn} onClick={() => handlePercentageClick(50)}>
            50%
          </button>
          <button type="button" className={styles.shortcutBtn} onClick={() => handlePercentageClick(75)}>
            75%
          </button>
          <button type="button" className={styles.shortcutBtn} onClick={() => handlePercentageClick(100)}>
            MAX
          </button>
        </div>

        <div className={styles.summary}>
          <div className={styles.summaryRow}>
            <span>Order Type:</span>
            <strong>Market Order</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>Execution Price:</span>
            <strong>${currentPrice.toFixed(2)}</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>Owned Position:</span>
            <strong>{ownedShares} shares</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>Estimated Total:</span>
            <strong>${estimatedTotal.toFixed(2)}</strong>
          </div>
        </div>

        <button
          type="submit"
          className={`${styles.submitBtn} ${side === 'buy' ? styles.btnBuy : styles.btnSell}`}
          disabled={parsedShares <= 0 || currentPrice <= 0 || (side === 'buy' && estimatedTotal > cash) || (side === 'sell' && parsedShares > ownedShares)}
        >
          {side === 'buy' ? `Buy ${selectedTicker}` : `Sell ${selectedTicker}`}
        </button>
      </form>
    </div>
  );
};
