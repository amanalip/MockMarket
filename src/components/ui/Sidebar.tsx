import React from 'react';
import { useUIStore } from '../../store';
import { AppMode } from '../../model/types';
import { 
  TrendingUp, 
  Cpu, 
  Layers, 
  GraduationCap, 
  Calendar 
} from 'lucide-react';
import styles from './Sidebar.module.css';

interface NavEntry {
  mode: AppMode;
  label: string;
  icon: React.ReactNode;
}

const navEntries: NavEntry[] = [
  { mode: 'trade', label: 'Paper Trading', icon: <TrendingUp size={18} /> },
  { mode: 'backtest', label: 'Backtester', icon: <Cpu size={18} /> },
  { mode: 'etf', label: 'ETF Builder', icon: <Layers size={18} /> },
  { mode: 'scenarios', label: 'Scenarios', icon: <GraduationCap size={18} /> },
  { mode: 'timeline', label: 'News & Events', icon: <Calendar size={18} /> },
];

export const Sidebar: React.FC = () => {
  const { mode, setMode } = useUIStore();

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.nav}>
        {navEntries.map((entry) => {
          const isActive = mode === entry.mode;
          return (
            <button
              key={entry.mode}
              className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              onClick={() => setMode(entry.mode)}
            >
              {entry.icon}
              <span>{entry.label}</span>
            </button>
          );
        })}
      </nav>
      <div className={styles.footer}>
        <span>v1.0.0 Static Edition</span>
      </div>
    </aside>
  );
};
