import { ETFAnalyticsDashboard } from '../etf/ETFAnalyticsDashboard';
import { ETFBuilderForm } from '../etf/ETFBuilderForm';
import { SavedETFsList } from '../etf/SavedETFsList';
import type { ETFSimulationResult } from '../../engine/etf/etf-builder';
import type { CustomETFConfig } from '../../model/types';
import styles from '../../App.module.css';

interface ETFModeProps {
  failedETF: CustomETFConfig | null;
  loadError: string | null;
  onLoadSavedETF: (etf: CustomETFConfig) => Promise<void>;
  onSimulationComplete: (result: ETFSimulationResult, operation?: number) => void;
  onSimulationStart: () => number;
  result: ETFSimulationResult | null;
}

export default function ETFMode({
  failedETF,
  loadError,
  onLoadSavedETF,
  onSimulationComplete,
  onSimulationStart,
  result,
}: ETFModeProps) {
  return (
    <div className={styles.modeStack}>
      <ETFBuilderForm
        onSimulationStart={onSimulationStart}
        onSimulationComplete={onSimulationComplete}
      />
      <SavedETFsList onSelect={onLoadSavedETF} />
      {loadError && failedETF && (
        <div role="alert" style={{ border: '1px solid var(--down-red)', borderRadius: 8, padding: 12 }}>
          <strong>Could not load saved ETF "{failedETF.name}".</strong>{' '}
          <span>{loadError}</span>{' '}
          <button type="button" onClick={() => void onLoadSavedETF(failedETF)}>Retry ETF load</button>
        </div>
      )}
      {result && <ETFAnalyticsDashboard result={result} />}
    </div>
  );
}
