import React, { useEffect } from 'react';
import { Layout } from './components/ui/Layout';
import { useUIStore } from './store';
import { StockScreener } from './components/stockpicker/StockScreener';
import { getTickerInfo } from './model/tickers';

export const App: React.FC = () => {
  const { mode, theme, selectedTicker } = useUIStore();
  const selectedInfo = getTickerInfo(selectedTicker);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>
              {mode === 'trade' && 'Paper Trading'}
              {mode === 'backtest' && 'Strategy Backtester'}
              {mode === 'etf' && 'Custom ETF Builder'}
              {mode === 'scenarios' && 'Educational Scenarios'}
              {mode === 'timeline' && 'News & Market Events'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {mode === 'trade' && `Currently inspecting ${selectedTicker} (${selectedInfo?.name || 'Unknown'})`}
              {mode === 'backtest' && 'Define algorithmic trading rules and test them against historical candles.'}
              {mode === 'etf' && 'Construct custom weighted portfolios and track weight drift.'}
              {mode === 'scenarios' && 'Interactive financial lessons with real market data.'}
              {mode === 'timeline' && 'Explore pivotal macroeconomic shocks and market milestones.'}
            </p>
          </div>
        </div>

        {mode === 'trade' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <StockScreener />
          </div>
        )}
      </div>
    </Layout>
  );
};
