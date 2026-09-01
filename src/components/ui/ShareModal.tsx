import React, { useEffect, useRef, useState } from 'react';
import { useBacktesterStore, useETFStore, useUIStore, usePortfolioStore } from '../../store';
import { generateShareableLink, ShareableStatePayload } from '../../engine/export/url-state';
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
  const backtestConfig = useBacktesterStore((state) => state.config);
  const activeETF = useETFStore((state) => state.activeETF);

  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'manual'>('idle');
  const urlInputRef = useRef<HTMLInputElement>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyOperationRef = useRef(0);

  useEffect(() => {
    if (isOpen) return;
    copyOperationRef.current += 1;
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = null;
    setCopyState('idle');
  }, [isOpen]);

  useEffect(() => () => {
    copyOperationRef.current += 1;
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
  }, []);

  if (!isOpen) return null;

  const sharePayload: ShareableStatePayload = {
    version: 1,
    mode,
    ticker: selectedTicker,
    date: simulationDate,
    cash,
    ...(mode === 'backtest' ? { backtest: backtestConfig } : {}),
    ...(mode === 'etf' && activeETF ? {
      etf: {
        name: activeETF.name,
        tickers: activeETF.tickers,
        rebalanceFrequency: activeETF.rebalanceFrequency,
      },
    } : {}),
  };

  const shareableUrl = generateShareableLink(sharePayload);
  const canShare = shareableUrl.length > 0;

  const handleCopy = async () => {
    if (!canShare) return;
    const operation = ++copyOperationRef.current;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard access is unavailable');
      await navigator.clipboard.writeText(shareableUrl);
      if (operation !== copyOperationRef.current || !isOpen) return;
      setCopyState('copied');
      addToast('Shareable URL copied to clipboard!', 'success');
      copyTimerRef.current = setTimeout(() => setCopyState('idle'), 2500);
    } catch {
      if (operation !== copyOperationRef.current || !isOpen) return;
      setCopyState('manual');
      urlInputRef.current?.focus();
      urlInputRef.current?.select();
      addToast('Clipboard copy failed. Select and copy the highlighted URL manually.', 'error');
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
          <label htmlFor="share-session-url" className={styles.sectionLabel}>Shareable URL (State Encoded)</label>
          <div className={styles.urlBox}>
            <input
              type="text"
              id="share-session-url"
              ref={urlInputRef}
              readOnly
              value={shareableUrl}
              className={styles.urlInput}
            />
            <button type="button" className={styles.copyBtn} disabled={!canShare} onClick={() => void handleCopy()}>
              {copyState === 'copied' ? <Check size={14} /> : <Copy size={14} />}
              <span>{copyState === 'copied' ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          {copyState === 'manual' && (
            <p role="alert" className={styles.copyHelp}>Clipboard access failed. The URL is selected; press Ctrl+C or Command+C to copy it.</p>
          )}
          {!canShare && (
            <p role="alert" className={styles.copyHelp}>This session contains values that cannot be shared. Shorten the ETF name or strategy rules and try again.</p>
          )}
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
