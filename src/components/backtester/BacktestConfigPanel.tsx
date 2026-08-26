import React from 'react';
import { useBacktesterStore, useUIStore } from '../../store';
import { CORE_TICKERS } from '../../model/tickers';
import { Play } from 'lucide-react';
import { StrategyEditor } from './StrategyEditor';
import { loadTickerData } from '../../data/loader';
import { runBacktest } from '../../engine/backtester/backtester';
import { compileRule, validateRule } from '../../parser/strategy-dsl';
import styles from './BacktestConfigPanel.module.css';

export const BacktestConfigPanel: React.FC = () => {
  const { config, setConfig, setResult, isRunning, setIsRunning, setError } = useBacktesterStore();
  const { addToast } = useUIStore();

  const handleRun = async () => {
    const entryVal = validateRule(config.entryRule);
    if (!entryVal.valid) {
      addToast(`Invalid Entry Rule: ${entryVal.error}`, 'error');
      return;
    }

    const exitVal = validateRule(config.exitRule);
    if (!exitVal.valid) {
      addToast(`Invalid Exit Rule: ${exitVal.error}`, 'error');
      return;
    }

    setIsRunning(true);
    setError(null);

    try {
      const [tickerCandles, spyCandles] = await Promise.all([
        loadTickerData(config.ticker),
        loadTickerData('SPY'),
      ]);

      const entryFn = compileRule(config.entryRule);
      const exitFn = compileRule(config.exitRule);

      const result = runBacktest(tickerCandles, spyCandles, config, entryFn, exitFn);
      setResult(result);
      addToast(`Backtest completed: ${result.stats.totalReturnPercent.toFixed(2)}% return across ${result.stats.totalTrades} trades.`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Backtest execution failed';
      setError(msg);
      addToast(msg, 'error');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.row}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Ticker</label>
          <select
            className={styles.input}
            value={config.ticker}
            onChange={(e) => setConfig({ ticker: e.target.value })}
          >
            {CORE_TICKERS.map((t) => (
              <option key={t.ticker} value={t.ticker}>
                {t.ticker} - {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Start Date</label>
          <input
            type="date"
            className={styles.input}
            value={config.startDate}
            onChange={(e) => setConfig({ startDate: e.target.value })}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>End Date</label>
          <input
            type="date"
            className={styles.input}
            value={config.endDate}
            onChange={(e) => setConfig({ endDate: e.target.value })}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Starting Capital ($)</label>
          <input
            type="number"
            min="1000"
            step="1000"
            className={styles.input}
            value={config.initialCash}
            onChange={(e) => setConfig({ initialCash: Number(e.target.value) })}
          />
        </div>
      </div>

      <StrategyEditor />

      <button
        className={styles.runBtn}
        onClick={handleRun}
        disabled={isRunning}
      >
        <Play size={18} />
        <span>{isRunning ? 'Simulating Strategy...' : 'Execute Backtest'}</span>
      </button>
    </div>
  );
};
