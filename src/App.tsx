import React, { useEffect, useState, useCallback } from 'react';
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
import { BacktestConfigPanel } from './components/backtester/BacktestConfigPanel';
import { BacktestResults } from './components/backtester/BacktestResults';
import { ETFBuilderForm } from './components/etf/ETFBuilderForm';
import { ETFAnalyticsDashboard } from './components/etf/ETFAnalyticsDashboard';
import { SavedETFsList } from './components/etf/SavedETFsList';
import { NewsFeed } from './components/timeline/NewsFeed';
import { TimeMachineCalculator } from './components/timemachine/TimeMachineCalculator';
import { ScenarioCatalog } from './components/scenarios/ScenarioCatalog';
import { ShortcutsModal } from './components/ui/ShortcutsModal';
import { ToastContainer } from './components/ui/Toast';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { getTickerInfo } from './model/tickers';
import { loadTickerData, getLatestCandleOnOrBefore } from './data/loader';
import { Candle, CustomETFConfig } from './model/types';
import { ETFSimulationResult, simulateETF } from './engine/etf/etf-builder';

export const App: React.FC = () => {
  const { mode, theme, selectedTicker, simulationDate, setSimulationDate } = useUIStore();
  const { updateMarketPrices, processCandleForOrders } = usePortfolioStore();
  const selectedInfo = getTickerInfo(selectedTicker);

  const [candles, setCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);
  const [etfResult, setEtfResult] = useState<ETFSimulationResult | null>(null);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const handleAdvanceOneDay = useCallback(() => {
    if (candles.length === 0) return;
    const curIdx = candles.findIndex((c) => c.time === simulationDate);
    const nextIdx = Math.min(candles.length - 1, (curIdx >= 0 ? curIdx : 0) + 1);
    const nextCandle = candles[nextIdx];
    if (nextCandle) {
      setSimulationDate(nextCandle.time);
      updateMarketPrices({ [selectedTicker]: nextCandle.close });
      processCandleForOrders(nextCandle, selectedTicker);
    }
  }, [candles, simulationDate, selectedTicker, setSimulationDate, updateMarketPrices, processCandleForOrders]);

  useKeyboardShortcuts({
    onToggleShortcutsModal: () => setIsShortcutsOpen((prev) => !prev),
    onAdvanceOneDay: handleAdvanceOneDay,
  });

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

  const handleLoadSavedETF = async (etf: CustomETFConfig) => {
    try {
      const tickerList = etf.tickers.map((t) => t.ticker);
      const candlesMap: Record<string, Candle[]> = {};
      await Promise.all(
        tickerList.map(async (sym) => {
          candlesMap[sym] = await loadTickerData(sym);
        })
      );
      const res = simulateETF(etf, candlesMap);
      setEtfResult(res);
    } catch (err) {
      console.error('Failed to load saved ETF', err);
    }
  };

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
              {mode === 'scenarios' && 'Educational Market Scenarios'}
              {mode === 'timeline' && 'News, Time Machine & Events'}
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {mode === 'trade' && `${selectedTicker} (${selectedInfo?.name || 'Instrument'}) | ${selectedInfo?.sector || ''}`}
              {mode === 'backtest' && 'Define algorithmic trading rules and test them against historical candles.'}
              {mode === 'etf' && 'Construct custom weighted portfolios and track weight drift.'}
              {mode === 'scenarios' && 'Interactive case studies guiding you through historical market shocks, earnings beats, and short squeezes.'}
              {mode === 'timeline' && 'Explore macroeconomic shocks, calculate what-if investment returns, and browse the catalyst feed.'}
            </p>
          </div>
        </div>

        {mode === 'trade' && (
          <>
            <SimulationBar candles={candles} />

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
          </>
        )}

        {mode === 'backtest' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <BacktestConfigPanel />
            <BacktestResults />
          </div>
        )}

        {mode === 'etf' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <ETFBuilderForm onSimulationComplete={setEtfResult} />
            <SavedETFsList onSelect={handleLoadSavedETF} />
            {etfResult && <ETFAnalyticsDashboard result={etfResult} />}
          </div>
        )}

        {mode === 'scenarios' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <ScenarioCatalog />
          </div>
        )}

        {mode === 'timeline' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <SimulationBar candles={candles} />
            <TimeMachineCalculator />
            <NewsFeed />
          </div>
        )}
      </div>
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
      <ToastContainer />
    </Layout>
  );
};
