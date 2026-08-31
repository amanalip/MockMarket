import React from 'react';
import { Info } from 'lucide-react';
import styles from './SyntheticDataNotice.module.css';

export const SyntheticDataNotice: React.FC = () => (
  <aside className={styles.notice} role="note" aria-label="Simulation data notice">
    <Info size={16} aria-hidden="true" />
    <span>
      <strong>Synthetic simulation data:</strong> Prices, volume, benchmark returns, and
      results are generated or approximate, not actual market history. For education only;
      not financial advice.
    </span>
  </aside>
);
