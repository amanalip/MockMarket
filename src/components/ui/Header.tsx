import React, { useState } from 'react';
import { useUIStore, usePortfolioStore } from '../../store';
import { Sun, Moon, Share2 } from 'lucide-react';
import { ShareModal } from './ShareModal';
import styles from './Header.module.css';

const GitHubIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

export const Header: React.FC = () => {
  const { theme, toggleTheme, simulationDate } = useUIStore();
  const { cash, positions } = usePortfolioStore();
  const [isShareOpen, setIsShareOpen] = useState(false);

  const totalPositionsValue = Object.values(positions).reduce(
    (sum, pos) => sum + (pos.currentValue || 0),
    0
  );
  const portfolioTotal = cash + totalPositionsValue;

  return (
    <>
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
          <a
            href="https://github.com/amanalip/MockMarket"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.iconButton}
            title="View Source on GitHub"
            aria-label="GitHub Repository"
          >
            <GitHubIcon size={18} />
          </a>
          <button
            className={styles.iconButton}
            onClick={() => setIsShareOpen(true)}
            title="Share or Export Session"
            aria-label="Share session"
          >
            <Share2 size={18} />
          </button>
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
      <ShareModal isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} />
    </>
  );
};
