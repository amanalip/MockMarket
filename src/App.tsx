import React, { useEffect } from 'react';
import { Layout } from './components/ui/Layout';
import { useUIStore } from './store';

export const App: React.FC = () => {
  const { mode, theme } = useUIStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
          {mode === 'trade' && 'Paper Trading'}
          {mode === 'backtest' && 'Strategy Backtester'}
          {mode === 'etf' && 'Custom ETF Builder'}
          {mode === 'scenarios' && 'Educational Scenarios'}
          {mode === 'timeline' && 'News & Market Events'}
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Welcome to MockMarket. Real historical data with zero financial risk.
        </p>
      </div>
    </Layout>
  );
};
