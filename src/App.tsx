import React, { useEffect, useState } from 'react';
import { Layout } from './components/ui/Layout';
import { useUIStore, usePortfolioStore } from './store';
import { StockScreener } from './components/stockpicker/StockScreener';
import { CandlestickChart } from './components/charts/CandlestickChart';
import { TradePanel } from './components/trading/TradePanel';
import { PortfolioDashboard } from './components/portfolio/PortfolioDashboard';
import { TradeHistory } from './components/portfolio/TradeHistory';
import { OrderManagement } from './components/trading/OrderManagement';
import { SimulationBar } from './components/timeline/SimulationBar';
import { RiskDashboard } from './components/portfolio/RiskDashboard';
import { ToastContainer } from './components/ui/Toast';
import { getTickerInfo } from './model/tickers';
import { loadTickerData, getLatestCandleOnOrBefore } from './data/loader';
import { Candle } from './model/types';

export const App: React.FC = () => {
  const { mode, theme, selectedTicker, simulationDate } = useUIStore();
  const { updateMarketPrices, processCandleForOrders } = usePortfolioStore();
  const selectedInfo = getTickerInfo(selectedTicker);

  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    let isMounted = true;
    Promise.resolve().then(() => {
      if (isMounted) setLoading(true);
    });

    loadTickerData(selectedTicker)
      .then((data) => {
        if (isMounted) {
          setCandles(data);
          setLoading(false);
          const currentCandle = getLatestCandleOnOrBefore(data, simulationDate);
          if (currentCandle) {
            updateMarketPrices({ [selectedTicker]: currentCandle.close });
            processCandleForOrders(currentCandle, selectedTicker);
          }
        }
      })
      .catch((err) => {
        console.error('Error loading candles:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedTicker, simulationDate, updateMarketPrices, processCandleForOrders]);

  const activeCandle = getLatestCandleOnOrBefore(candles, simulationDate) || candles[candles.length - 1];

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
              {mode === 'trade' && `${selectedTicker} (${selectedInfo?.name || 'Instrument'}) | ${selectedInfo?.sector || ''}`}
              {mode === 'backtest' && 'Define algorithmic trading rules and test them against historical candles.'}
              {mode === 'etf' && 'Construct custom weighted portfolios and track weight drift.'}
              {mode === 'scenarios' && 'Interactive financial lessons with real market data.'}
              {mode === 'timeline' && 'Explore pivotal macroeconomic shocks and market milestones.'}
            </p>
          </div>
        </div>

        <SimulationBar candles={candles} />

        {mode === 'trade' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: '20px' }}>
              <CandlestickChart
                candles={candles}
                ticker={selectedTicker}
                theme={theme}
                simulationDate={simulationDate}
                loading={loading}
              />
              <TradePanel currentCandle={activeCandle} />
            </div>

            <PortfolioDashboard />

            <RiskDashboard />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
              <OrderManagement />
              <TradeHistory />
            </div>

            <StockScreener />
          </div>
        )}
      </div>
      <ToastContainer />
    </Layout>
  );
};
