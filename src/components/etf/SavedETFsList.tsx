import React from 'react';
import { useETFStore } from '../../store';
import { CustomETFConfig } from '../../model/types';
import { Trash2, Bookmark } from 'lucide-react';
import styles from './SavedETFsList.module.css';

interface SavedETFsListProps {
  onSelect: (etf: CustomETFConfig) => void;
}

export const SavedETFsList: React.FC<SavedETFsListProps> = ({ onSelect }) => {
  const { savedETFs, deleteETF } = useETFStore();

  if (savedETFs.length === 0) return null;

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Bookmark size={16} color="var(--accent)" />
        <span className={styles.title}>Saved Custom ETFs ({savedETFs.length})</span>
      </div>

      <div className={styles.list}>
        {savedETFs.map((etf) => (
          <div key={etf.id} className={styles.item}>
            <div className={styles.info}>
              <span className={styles.name}>{etf.name}</span>
              <span className={styles.details}>
                {etf.tickers.map((t) => `${t.ticker} (${t.targetWeight}%)`).join(', ')} | Rebalance: {etf.rebalanceFrequency}
              </span>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => onSelect(etf)}
              >
                Load
              </button>
              <button
                type="button"
                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                onClick={() => deleteETF(etf.id)}
                title="Delete ETF"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
