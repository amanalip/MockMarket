import React, { lazy, Suspense, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Layout } from './components/ui/Layout';
import { useUIStore, usePortfolioStore } from './store';
import { ShortcutsModal } from './components/ui/ShortcutsModal';
import { ToastContainer } from './components/ui/Toast';
import { SyntheticDataNotice } from './components/ui/SyntheticDataNotice';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { getTickerInfo } from './model/tickers';
import { loadTickerData, getLatestCandleOnOrBefore } from './data/loader';
import { Candle, CustomETFConfig } from './model/types';
import { ETFSimulationResult, simulateETF } from './engine/etf/etf-builder';
import styles from './App.module.css';

const TradeMode = lazy(() => import('./components/modes/TradeMode'));
const BacktestMode = lazy(() => import('./components/modes/BacktestMode'));
const ETFMode = lazy(() => import('./components/modes/ETFMode'));
const ScenariosMode = lazy(() => import('./components/modes/ScenariosMode'));
const TimelineMode = lazy(() => import('./components/modes/TimelineMode'));

export const App: React.FC = () => {
  const { mode, theme, selectedTicker, simulationDate, setSimulationDate } = useUIStore();
  const { updateMarketPrices, processCandleForOrders } = usePortfolioStore();
  const selectedInfo = getTickerInfo(selectedTicker);

  const [loadedData, setLoadedData] = useState<{ ticker: string | null; candles: Candle[] }>({ ticker: null, candles: [] });
  const [loading, setLoading] = useState(false);
  const [tickerLoadError, setTickerLoadError] = useState<string | null>(null);
  const [tickerRetry, setTickerRetry] = useState(0);
  const [etfResult, setEtfResult] = useState<ETFSimulationResult | null>(null);
  const [etfLoadError, setEtfLoadError] = useState<string | null>(null);
  const [failedETF, setFailedETF] = useState<CustomETFConfig | null>(null);
  const etfOperationRef = useRef(0);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  const hasSelectedTickerData = loadedData.ticker === selectedTicker;
  const candles = useMemo(
    () => hasSelectedTickerData ? loadedData.candles : [],
    [hasSelectedTickerData, loadedData.candles]
  );

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
    setLoadedData({ ticker: null, candles: [] });
    setTickerLoadError(null);
    Promise.resolve().then(() => {
      if (isMounted) setLoading(true);
    });

    loadTickerData(selectedTicker)
      .then((data) => {
        if (isMounted) {
          setLoadedData({ ticker: selectedTicker, candles: data });
          setLoading(false);
          const currentCandle = getLatestCandleOnOrBefore(data, simulationDate);
          if (currentCandle) {
            updateMarketPrices({ [selectedTicker]: currentCandle.close });
            processCandleForOrders(currentCandle, selectedTicker);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setLoadedData({ ticker: null, candles: [] });
          setTickerLoadError(err instanceof Error ? err.message : 'Unknown data error');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedTicker, simulationDate, tickerRetry, updateMarketPrices, processCandleForOrders]);

  const handleLoadSavedETF = async (etf: CustomETFConfig) => {
    const operation = ++etfOperationRef.current;
    setEtfResult(null);
    setEtfLoadError(null);
    setFailedETF(null);
    try {
      const tickerList = etf.tickers.map((t) => t.ticker);
      const candlesMap: Record<string, Candle[]> = {};
      await Promise.all(
        tickerList.map(async (sym) => {
          candlesMap[sym] = await loadTickerData(sym);
        })
      );
      const res = simulateETF(etf, candlesMap);
      if (operation !== etfOperationRef.current) return;
      setEtfResult(res);
    } catch (err) {
      if (operation !== etfOperationRef.current) return;
      setEtfResult(null);
      setFailedETF(etf);
      setEtfLoadError(err instanceof Error ? err.message : 'Unknown data error');
    }
  };

  const activeCandle = getLatestCandleOnOrBefore(candles, simulationDate) || candles[candles.length - 1];

  return (
    <Layout>
      <div className={styles.page}>
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
              {mode === 'backtest' && 'Define algorithmic trading rules and test them against generated price paths.'}
              {mode === 'etf' && 'Construct custom weighted portfolios and track weight drift.'}
              {mode === 'scenarios' && 'Interactive case studies guiding you through historical market shocks, earnings beats, and short squeezes.'}
              {mode === 'timeline' && 'Explore macroeconomic shocks, calculate what-if investment returns, and browse the catalyst feed.'}
            </p>
          </div>
        </div>

        {mode !== 'scenarios' && <SyntheticDataNotice />}

        <Suspense fallback={<div role="status" aria-live="polite">Loading mode...</div>}>
          {mode === 'trade' && (
            <TradeMode
              activeCandle={activeCandle}
              candles={candles}
              hasSelectedTickerData={hasSelectedTickerData}
              loading={loading}
              onRetry={() => setTickerRetry((value) => value + 1)}
              selectedTicker={selectedTicker}
              simulationDate={simulationDate}
              theme={theme}
              tickerLoadError={tickerLoadError}
            />
          )}

          {mode === 'backtest' && <BacktestMode />}

          {mode === 'etf' && (
            <ETFMode
              failedETF={failedETF}
              loadError={etfLoadError}
              onLoadSavedETF={handleLoadSavedETF}
              onSimulationStart={() => {
                const operation = ++etfOperationRef.current;
                setEtfResult(null);
                setEtfLoadError(null);
                return operation;
              }}
              onSimulationComplete={(result, operation) => {
                if (operation === etfOperationRef.current) setEtfResult(result);
              }}
              result={etfResult}
            />
          )}

          {mode === 'scenarios' && <ScenariosMode />}
          {mode === 'timeline' && <TimelineMode candles={candles} />}
        </Suspense>
      </div>
      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />
      <ToastContainer />
    </Layout>
  );
};
