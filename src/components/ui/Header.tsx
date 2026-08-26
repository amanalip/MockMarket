import React from 'react';
import { useUIStore, usePortfolioStore } from '../../store';
import { Sun, Moon } from 'lucide-react';
import styles from './Header.module.css';

export const Header: React.FC = () => {
  const { theme, toggleTheme, simulationDate } = useUIStore();
  const { cash, positions } = usePortfolioStore();

  const totalPositionsValue = Object.values(positions).reduce(
    (sum, pos) => sum + (pos.currentValue || 0),
    0
  );
  const portfolioTotal = cash + totalPositionsValue;

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <span className={styles.logoIcon}>📈</span>
        <span>MockMarket</span>
        <span className={styles.tagline}>Real data. Fake money. Real lessons.</span>
      </div>

      <div className={styles.stats}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Simulation Date</span>
          <span className={styles.statValue}>{simulationDate}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Portfolio Value</span>
          <span className={styles.statValue}>${portfolioTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>Cash</span>
          <span className={styles.statValue}>${cash.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          className={`${styles.iconButton} ${styles.themeBtn}`}
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
};
