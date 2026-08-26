import React, { useMemo } from 'react';
import { useBacktesterStore } from '../../store';
import { SAMPLE_STRATEGIES } from '../../parser/sample-strategies';
import { validateRule } from '../../parser/strategy-dsl';
import { StrategyTemplate } from '../../parser/strategy-types';
import styles from './StrategyEditor.module.css';

export const StrategyEditor: React.FC = () => {
  const { config, setConfig } = useBacktesterStore();

  const entryValidation = useMemo(() => validateRule(config.entryRule), [config.entryRule]);
  const exitValidation = useMemo(() => validateRule(config.exitRule), [config.exitRule]);

  const loadTemplate = (tmpl: StrategyTemplate) => {
    setConfig({
      entryRule: tmpl.entryRule,
      exitRule: tmpl.exitRule,
      stopLossPercent: tmpl.defaultStopLoss ?? config.stopLossPercent,
      takeProfitPercent: tmpl.defaultTakeProfit ?? config.takeProfitPercent,
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <span className={styles.title}>Strategy Rule Editor</span>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Write rule conditions using technical indicators, comparisons, and logic.
          </div>
        </div>

        <div className={styles.templatesGroup}>
          {SAMPLE_STRATEGIES.map((tmpl) => (
            <button
              key={tmpl.id}
              className={styles.templateBtn}
              onClick={() => loadTemplate(tmpl)}
              title={tmpl.description}
            >
              {tmpl.name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.editorGroup}>
        <label className={styles.label}>Entry Condition</label>
        <input
          type="text"
          className={styles.editorInput}
          value={config.entryRule}
          onChange={(e) => setConfig({ entryRule: e.target.value })}
          placeholder="e.g. crosses_above(SMA(50), SMA(200))"
        />
        {entryValidation.valid ? (
          <span className={styles.validMsg}>✓ Valid entry syntax</span>
        ) : (
          <span className={styles.errorMsg}>✕ {entryValidation.error}</span>
        )}
      </div>

      <div className={styles.editorGroup}>
        <label className={styles.label}>Exit Condition</label>
        <input
          type="text"
          className={styles.editorInput}
          value={config.exitRule}
          onChange={(e) => setConfig({ exitRule: e.target.value })}
          placeholder="e.g. crosses_below(SMA(50), SMA(200)) OR RSI() > 70"
        />
        {exitValidation.valid ? (
          <span className={styles.validMsg}>✓ Valid exit syntax</span>
        ) : (
          <span className={styles.errorMsg}>✕ {exitValidation.error}</span>
        )}
      </div>

      <div className={styles.paramsRow}>
        <div className={styles.paramCard}>
          <label className={styles.label}>Position Size (%)</label>
          <input
            type="number"
            min="10"
            max="100"
            step="5"
            className={styles.paramInput}
            value={config.positionSizePercent}
            onChange={(e) => setConfig({ positionSizePercent: Number(e.target.value) })}
          />
        </div>

        <div className={styles.paramCard}>
          <label className={styles.label}>Stop Loss (%)</label>
          <input
            type="number"
            min="0"
            max="50"
            step="1"
            className={styles.paramInput}
            value={config.stopLossPercent ?? 0}
            onChange={(e) => setConfig({ stopLossPercent: Number(e.target.value) })}
          />
        </div>

        <div className={styles.paramCard}>
          <label className={styles.label}>Take Profit (%)</label>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            className={styles.paramInput}
            value={config.takeProfitPercent ?? 0}
            onChange={(e) => setConfig({ takeProfitPercent: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
};
