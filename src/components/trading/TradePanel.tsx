import React, { useState } from 'react';
import { useUIStore, usePortfolioStore } from '../../store';
import { Candle, OrderSide, OrderType } from '../../model/types';
import styles from './TradePanel.module.css';

interface TradePanelProps {
  currentCandle?: Candle;
  disabled?: boolean;
}

export const TradePanel: React.FC<TradePanelProps> = ({ currentCandle, disabled = false }) => {
  const { selectedTicker, simulationDate, addToast } = useUIStore();
  const { availableCash, positions, executeTrade } = usePortfolioStore();

  const [side, setSide] = useState<OrderSide>('buy');
  const [orderType, setOrderType] = useState<OrderType>('market');
  const [sharesInput, setSharesInput] = useState<string>('10');
  const [priceInput, setPriceInput] = useState<string>('');

  const currentPrice = currentCandle?.close || 0;
  const currentPosition = positions[selectedTicker];
  const ownedShares = currentPosition?.shares || 0;

  const rawShares = Number(sharesInput);
  const parsedShares = Number.isInteger(rawShares) && rawShares > 0 ? rawShares : 0;
  const rawPrice = orderType === 'market' ? currentPrice : (priceInput.trim() === '' ? currentPrice : Number(priceInput));
  const targetPrice = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : (orderType === 'market' ? currentPrice : 0);

  const estimatedTotal = parsedShares * targetPrice;

  const handlePercentageClick = (percent: number) => {
    if (disabled) return;
    if (!Number.isFinite(targetPrice) || targetPrice <= 0 || !Number.isFinite(availableCash) || !Number.isFinite(ownedShares)) return;
    if (side === 'buy') {
      if (!Number.isFinite(availableCash) || availableCash <= 0) return;
      const maxShares = Math.floor(availableCash / targetPrice);
      if (!Number.isFinite(maxShares) || maxShares <= 0) return;
      const target = Math.max(1, Math.floor(maxShares * (percent / 100)));
      if (!Number.isFinite(target) || target <= 0) return;
      setSharesInput(String(target));
    } else {
      const target = Math.max(1, Math.floor(ownedShares * (percent / 100)));
      if (!Number.isFinite(target) || target <= 0) return;
      setSharesInput(String(target));
    }
  };

  const handleTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    if (targetPrice <= 0) {
      addToast('Price must be greater than zero.', 'error');
      return;
    }

    if (parsedShares <= 0) {
      addToast('Please specify a positive number of shares.', 'error');
      return;
    }

    if (side === 'buy' && estimatedTotal > availableCash) {
      addToast('Insufficient cash available for this order.', 'error');
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
        type: orderType,
        shares: parsedShares,
        limitPrice: orderType === 'limit' ? targetPrice : undefined,
        stopPrice: (orderType === 'stop_loss' || orderType === 'take_profit') ? targetPrice : undefined,
        date: simulationDate,
      },
      currentCandle
    );

    if (result.success) {
      if (result.filled) {
        addToast(
          `${side === 'buy' ? 'Bought' : 'Sold'} ${parsedShares} shares of ${selectedTicker} at $${(result.filledPrice || targetPrice).toFixed(2)}`,
          'success'
        );
      } else {
        addToast(
          `Placed pending ${orderType.replace('_', ' ')} order for ${parsedShares} shares of ${selectedTicker} at $${targetPrice.toFixed(2)}`,
          'info'
        );
      }
    } else {
      addToast(result.error || 'Failed to execute order.', 'error');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Order Placement</span>
        <span className={styles.cashBalance}>Available: ${availableCash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
          <label className={styles.label}>Order Type</label>
          <div className={styles.inputGroup}>
            <select
              className={styles.input}
              value={orderType}
              onChange={(e) => {
                const val = e.target.value as OrderType;
                setOrderType(val);
                if (val !== 'market' && !priceInput) {
                  setPriceInput(currentPrice ? currentPrice.toFixed(2) : '');
                }
              }}
            >
              <option value="market">Market Order</option>
              <option value="limit">Limit Order</option>
              <option value="stop_loss">Stop Loss</option>
              <option value="take_profit">Take Profit</option>
            </select>
          </div>
        </div>

        {orderType !== 'market' && (
          <div className={styles.formGroup}>
            <label className={styles.label}>
              {orderType === 'limit' && 'Limit Price ($)'}
              {orderType === 'stop_loss' && 'Stop Price ($)'}
              {orderType === 'take_profit' && 'Take Profit Target ($)'}
            </label>
            <div className={styles.inputGroup}>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className={styles.input}
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder="Target Price"
              />
            </div>
          </div>
        )}

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
            <strong>{orderType.replace('_', ' ').toUpperCase()}</strong>
          </div>
          <div className={styles.summaryRow}>
            <span>Target Price:</span>
            <strong>${targetPrice.toFixed(2)}</strong>
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
          disabled={disabled || parsedShares <= 0 || targetPrice <= 0 || (side === 'buy' && estimatedTotal > availableCash) || (side === 'sell' && parsedShares > ownedShares)}
        >
          {side === 'buy' ? `Submit Buy ${selectedTicker}` : `Submit Sell ${selectedTicker}`}
        </button>
      </form>
    </div>
  );
};
