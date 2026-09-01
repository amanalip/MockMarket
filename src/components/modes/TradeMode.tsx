import { CandlestickChart } from '../charts/CandlestickChart';
import { PortfolioDashboard } from '../portfolio/PortfolioDashboard';
import { RiskDashboard } from '../portfolio/RiskDashboard';
import { TradeHistory } from '../portfolio/TradeHistory';
import { StockScreener } from '../stockpicker/StockScreener';
import { SimulationBar } from '../timeline/SimulationBar';
import { OrderManagement } from '../trading/OrderManagement';
import { TradePanel } from '../trading/TradePanel';
import type { Candle } from '../../model/types';
import styles from '../../App.module.css';

interface TradeModeProps {
  activeCandle?: Candle;
  candles: Candle[];
  hasSelectedTickerData: boolean;
  loading: boolean;
  onRetry: () => void;
  selectedTicker: string;
  simulationDate: string;
  theme: 'light' | 'dark';
  tickerLoadError: string | null;
}

export default function TradeMode({
  activeCandle,
  candles,
  hasSelectedTickerData,
  loading,
  onRetry,
  selectedTicker,
  simulationDate,
  theme,
  tickerLoadError,
}: TradeModeProps) {
  return (
    <>
      <SimulationBar candles={candles} />

      {tickerLoadError && (
        <div role="alert" style={{ border: '1px solid var(--down-red)', borderRadius: 8, padding: 12 }}>
          <strong>Could not load market data for {selectedTicker}.</strong>{' '}
          <span>{tickerLoadError}</span>{' '}
          <button type="button" onClick={onRetry}>Retry {selectedTicker}</button>
        </div>
      )}

      <div className={styles.tradeStack}>
        <div className={styles.tradeGrid}>
          <CandlestickChart
            key={selectedTicker}
            candles={candles}
            ticker={selectedTicker}
            theme={theme}
            simulationDate={simulationDate}
            loading={loading}
          />
          <TradePanel currentCandle={activeCandle} disabled={!hasSelectedTickerData || !activeCandle} />
        </div>

        <PortfolioDashboard />
        <RiskDashboard />

        <div className={styles.activityGrid}>
          <OrderManagement />
          <TradeHistory />
        </div>

        <StockScreener />
      </div>
    </>
  );
}
