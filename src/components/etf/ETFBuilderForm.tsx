import React, { useEffect, useState } from 'react';
import { useETFStore, useUIStore } from '../../store';
import { CORE_TICKERS } from '../../model/tickers';
import { CustomETFConfig, RebalanceFrequency, Candle } from '../../model/types';
import { normalizeWeights, simulateETF, ETFSimulationResult } from '../../engine/etf/etf-builder';
import { loadTickerData } from '../../data/loader';
import { Plus, Trash2, Layers, Shuffle } from 'lucide-react';
import styles from './ETFBuilderForm.module.css';

interface ETFBuilderFormProps {
  onSimulationComplete: (result: ETFSimulationResult, operation?: number) => void;
  onSimulationStart?: () => number | void;
}

export const ETFBuilderForm: React.FC<ETFBuilderFormProps> = ({ onSimulationComplete, onSimulationStart }) => {
  const { saveETF, activeETF } = useETFStore();
  const { addToast } = useUIStore();

  const [name, setName] = useState('My Custom Tech & Growth Fund');
  const [selectedTickers, setSelectedTickers] = useState<{ ticker: string; targetWeight: number }[]>([
    { ticker: 'AAPL', targetWeight: 30 },
    { ticker: 'MSFT', targetWeight: 30 },
    { ticker: 'GOOGL', targetWeight: 20 },
    { ticker: 'AMZN', targetWeight: 20 },
  ]);
  const [rebalanceFreq, setRebalanceFreq] = useState<RebalanceFrequency>('quarterly');
  const [addTickerInput, setAddTickerInput] = useState('TSLA');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeETF) return;
    setName(activeETF.name);
    setSelectedTickers(activeETF.tickers.map((item) => ({ ...item })));
    setRebalanceFreq(activeETF.rebalanceFrequency);
  }, [activeETF]);

  const totalWeight = selectedTickers.reduce((sum, t) => sum + t.targetWeight, 0);

  const handleAddTicker = () => {
    if (!addTickerInput) return;
    if (selectedTickers.some((t) => t.ticker === addTickerInput)) {
      addToast(`${addTickerInput} is already added to the ETF.`, 'error');
      return;
    }
    const newItems = [...selectedTickers, { ticker: addTickerInput, targetWeight: 10 }];
    setSelectedTickers(normalizeWeights(newItems));
  };

  const handleRemoveTicker = (ticker: string) => {
    if (selectedTickers.length <= 1) {
      addToast('An ETF must contain at least one constituent ticker.', 'error');
      return;
    }
    const updated = selectedTickers.filter((t) => t.ticker !== ticker);
    setSelectedTickers(normalizeWeights(updated));
  };

  const handleWeightChange = (ticker: string, newWeight: number) => {
    setSelectedTickers(
      selectedTickers.map((t) => (t.ticker === ticker ? { ...t, targetWeight: newWeight } : t))
    );
  };

  const handleEqualWeight = () => {
    setSelectedTickers(normalizeWeights(selectedTickers.map((t) => ({ ticker: t.ticker, targetWeight: 1 }))));
  };

  const handleSimulate = async () => {
    if (!name.trim()) {
      addToast('Please specify a name for your custom ETF.', 'error');
      return;
    }

    const operation = onSimulationStart?.();
    setLoadError(null);
    setLoading(true);
    try {
      // Load candle data for all constituent tickers + benchmarks
      const tickerList = selectedTickers.map((t) => t.ticker);
      const allTickersToLoad = Array.from(new Set([...tickerList, 'SPY', 'QQQ']));

      const candlesMap: Record<string, Candle[]> = {};
      await Promise.all(
        allTickersToLoad.map(async (sym) => {
          candlesMap[sym] = await loadTickerData(sym);
        })
      );

      const etfConfig: CustomETFConfig = {
        id: `etf_${Date.now()}`,
        name,
        tickers: selectedTickers,
        rebalanceFrequency: rebalanceFreq,
        createdAt: new Date().toISOString().split('T')[0],
      };

      const result = simulateETF(etfConfig, candlesMap);
      if (!saveETF(result.config)) {
        throw new Error('The ETF could not be saved in this browser. Check storage permissions and try again.');
      }
      onSimulationComplete(result, operation ?? undefined);
      addToast(`Simulated ${name}: Total Return ${result.metrics.totalReturnPercent.toFixed(2)}%`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to simulate custom ETF.';
      setLoadError(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>Custom ETF Constructor</span>
      </div>

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="etf-fund-name">Fund Name</label>
          <input
            id="etf-fund-name"
            type="text"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Clean Energy Growth ETF"
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label} htmlFor="etf-rebalance-frequency">Rebalancing Schedule</label>
          <select
            id="etf-rebalance-frequency"
            className={styles.input}
            value={rebalanceFreq}
            onChange={(e) => setRebalanceFreq(e.target.value as RebalanceFrequency)}
          >
            <option value="monthly">Monthly Rebalancing</option>
            <option value="quarterly">Quarterly Rebalancing</option>
            <option value="annually">Annual Rebalancing</option>
            <option value="never">Never (Natural Drift)</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <select
          aria-label="Ticker to add"
          className={styles.input}
          style={{ flex: 1 }}
          value={addTickerInput}
          onChange={(e) => setAddTickerInput(e.target.value)}
        >
          {CORE_TICKERS.map((t) => (
            <option key={t.ticker} value={t.ticker}>
              {t.ticker} - {t.name} ({t.sector})
            </option>
          ))}
        </select>
        <button type="button" className={styles.secondaryBtn} onClick={handleAddTicker}>
          <Plus size={16} style={{ display: 'inline', verticalAlign: 'middle' }} /> Add Ticker
        </button>
      </div>

      <div className={styles.tickerList}>
        {selectedTickers.map((item) => (
          <div key={item.ticker} className={styles.tickerItem}>
            <span className={styles.tickerBadge}>{item.ticker}</span>
            <input
              type="range"
              min="1"
              max="100"
              className={styles.weightSlider}
              aria-label={`${item.ticker} target weight`}
              value={item.targetWeight}
              onChange={(e) => handleWeightChange(item.ticker, Number(e.target.value))}
            />
            <span className={styles.weightValue}>{item.targetWeight}%</span>
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => handleRemoveTicker(item.ticker)}
              aria-label={`Remove ${item.ticker}`}
              title="Remove ticker"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className={styles.actionBar}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button type="button" className={styles.secondaryBtn} onClick={handleEqualWeight}>
            <Shuffle size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> Equal Weight
          </button>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={() => setSelectedTickers(normalizeWeights(selectedTickers))}
          >
            Normalize to 100%
          </button>
        </div>

        <span className={styles.weightTotal} style={{ color: totalWeight === 100 ? 'var(--up-green)' : 'var(--down-red)' }}>
          Total Weight: {totalWeight.toFixed(1)}% {totalWeight !== 100 ? '(Will auto-normalize on run)' : ''}
        </span>
      </div>

      {loadError && (
        <div role="alert" style={{ color: 'var(--down-red)' }}>
          Could not load data and simulate "{name}": {loadError}. Use Retry below to try again.
        </div>
      )}

      <button
        type="button"
        className={styles.submitBtn}
        onClick={handleSimulate}
        disabled={loading}
      >
        <Layers size={18} />
        <span>{loading ? 'Calculating NAV & Weight Drift...' : loadError ? 'Retry ETF simulation' : 'Simulate Custom ETF'}</span>
      </button>
    </div>
  );
};
