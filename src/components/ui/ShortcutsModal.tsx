import React, { useId, useRef } from 'react';
import { X, Keyboard } from 'lucide-react';
import styles from './ShortcutsModal.module.css';
import { useModalFocus } from '../../hooks/useModalFocus';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: '1 - 5', desc: 'Switch Navigation View (Trade, Backtest, ETF, Scenarios, Timeline)' },
  { key: 'Space', desc: 'Toggle Simulation Auto-Play / Pause' },
  { key: '→', desc: 'Advance Simulation Timeline +1 Day' },
  { key: 'B', desc: 'Switch Trade Panel to BUY Mode' },
  { key: 'S', desc: 'Switch Trade Panel to SELL Mode' },
  { key: 'T', desc: 'Toggle Dark / Light Theme' },
  { key: '?', desc: 'Open / Close Keyboard Shortcuts Modal' },
  { key: 'Esc', desc: 'Close Active Modal Dialog' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  useModalFocus(isOpen, dialogRef, closeButtonRef, onClose);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={dialogRef} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Keyboard size={18} color="var(--accent)" />
            <h2 id={titleId} className={styles.title}>Keyboard Shortcuts</h2>
          </div>
          <button ref={closeButtonRef} type="button" className={styles.closeBtn} onClick={onClose} aria-label="Close keyboard shortcuts dialog">
            <X size={18} />
          </button>
        </div>

        <div className={styles.shortcutsList}>
          {SHORTCUTS.map((item) => (
            <div key={item.key} className={styles.item}>
              <span className={styles.desc}>{item.desc}</span>
              <kbd className={styles.kbd}>{item.key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
