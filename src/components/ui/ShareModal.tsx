import React, { useState } from 'react';
import { useUIStore, usePortfolioStore } from '../../store';
import { generateShareableLink } from '../../engine/export/url-state';
import {
  exportTradesToCSV,
  exportPositionsToCSV,
  downloadCSV,
} from '../../engine/export/csv-export';
import { X, Copy, Check, Download, Share2 } from 'lucide-react';
import styles from './ShareModal.module.css';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose }) => {
  const { mode, selectedTicker, simulationDate, addToast } = useUIStore();
  const { cash, trades, positions } = usePortfolioStore();

  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const sharePayload = {
    version: 1,
    mode,
    ticker: selectedTicker,
    date: simulationDate,
    cash,
  };

  const shareableUrl = generateShareableLink(sharePayload);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareableUrl);
      setCopied(true);
      addToast('Shareable URL copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleExportTradesCSV = () => {
    const csv = exportTradesToCSV(trades);
    downloadCSV(`mockmarket_trades_${simulationDate}.csv`, csv);
    addToast('Exported trades to CSV.', 'success');
  };

  const handleExportPositionsCSV = () => {
    const csv = exportPositionsToCSV(positions);
    downloadCSV(`mockmarket_positions_${simulationDate}.csv`, csv);
    addToast('Exported holdings to CSV.', 'success');
  };

  const handleExportJSON = () => {
    const dataStr = JSON.stringify({ cash, positions, trades, simulationDate }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mockmarket_portfolio_${simulationDate}.json`;
    link.click();
    URL.revokeObjectURL(url);
    addToast('Exported complete portfolio JSON snapshot.', 'success');
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Share2 size={18} color="var(--accent)" />
            <span className={styles.title}>Share & Export Session</span>
          </div>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className={styles.section}>
          <label className={styles.sectionLabel}>Shareable URL (State Encoded)</label>
          <div className={styles.urlBox}>
            <input
              type="text"
              readOnly
              value={shareableUrl}
              className={styles.urlInput}
            />
            <button type="button" className={styles.copyBtn} onClick={handleCopy}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        <div className={styles.section}>
          <label className={styles.sectionLabel}>Data Exports</label>
          <div className={styles.buttonGrid}>
            <button type="button" className={styles.exportBtn} onClick={handleExportTradesCSV}>
              <Download size={14} />
              <span>Export Trades (CSV)</span>
            </button>

            <button type="button" className={styles.exportBtn} onClick={handleExportPositionsCSV}>
              <Download size={14} />
              <span>Export Holdings (CSV)</span>
            </button>

            <button type="button" className={styles.exportBtn} onClick={handleExportJSON}>
              <Download size={14} />
              <span>Portfolio State (JSON)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
