import React from 'react';
import { ETFSimulationResult } from '../../engine/etf/etf-builder';
import { ETFPerformanceChart } from './ETFPerformanceChart';
import { WeightDriftChart } from './WeightDriftChart';
import { getTickerInfo } from '../../model/tickers';
import styles from './ETFAnalyticsDashboard.module.css';

interface ETFAnalyticsDashboardProps {
  result: ETFSimulationResult;
}

export const ETFAnalyticsDashboard: React.FC<ETFAnalyticsDashboardProps> = ({ result }) => {
  const { config, navHistory, driftHistory, metrics, startDate, endDate } = result;
  const isPos = metrics.totalReturnPercent >= 0;

  const latestDrift = driftHistory.length > 0
    ? driftHistory[driftHistory.length - 1].weights
    : {};

  const constituentTickers = config.tickers.map((t) => t.ticker);

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>{config.name}</span>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Rebalance: {config.rebalanceFrequency} | History: {startDate} to {endDate}
          </div>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.card}>
          <span className={styles.label}>Total Return</span>
          <span className={`${styles.value} ${isPos ? styles.up : styles.down}`}>
            {isPos ? '+' : ''}{metrics.totalReturnPercent.toFixed(2)}%
          </span>
          <span className={styles.sub}>CAGR: {metrics.annualizedReturnPercent.toFixed(2)}%</span>
        </div>

        <div className={styles.card}>
          <span className={styles.label}>Annualized Volatility</span>
          <span className={styles.value}>{metrics.annualizedVolatility.toFixed(2)}%</span>
          <span className={styles.sub}>Risk metric</span>
        </div>

        <div className={styles.card}>
          <span className={styles.label}>Sharpe Ratio</span>
          <span className={styles.value}>{metrics.sharpeRatio.toFixed(2)}</span>
          <span className={styles.sub}>Risk-adjusted return</span>
        </div>

        <div className={styles.card}>
          <span className={styles.label}>Max Drawdown</span>
          <span className={`${styles.value} ${metrics.maxDrawdownPercent > 0 ? styles.down : ''}`}>
            -{metrics.maxDrawdownPercent.toFixed(2)}%
          </span>
          <span className={styles.sub}>Peak to trough</span>
        </div>
      </div>

      <ETFPerformanceChart navHistory={navHistory} fundName={config.name} />

      <WeightDriftChart driftHistory={driftHistory} tickers={constituentTickers} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Fund Holdings & Weight Comparison
        </span>
        <div tabIndex={0} aria-label="ETF holdings table, horizontally scrollable" style={{ overflowX: 'auto', border: '1px solid var(--border)', borderRadius: '6px' }}>
          <table className={styles.holdingsTable}>
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Company / Asset</th>
                <th>Sector</th>
                <th className={styles.num}>Target Weight</th>
                <th className={styles.num}>Current Drift Weight</th>
                <th className={styles.num}>Weight Drift Delta</th>
              </tr>
            </thead>
            <tbody>
              {config.tickers.map((t) => {
                const info = getTickerInfo(t.ticker);
                const currentWeight = latestDrift[t.ticker] ?? t.targetWeight;
                const driftDelta = currentWeight - t.targetWeight;
                const isOverweight = driftDelta >= 0;

                return (
                  <tr key={t.ticker}>
                    <td><strong>{t.ticker}</strong></td>
                    <td>{info?.name || t.ticker}</td>
                    <td>{info?.sector || 'Other'}</td>
                    <td className={styles.num}>{t.targetWeight.toFixed(1)}%</td>
                    <td className={styles.num}>{currentWeight.toFixed(1)}%</td>
                    <td className={`${styles.num} ${isOverweight ? styles.up : styles.down}`}>
                      {isOverweight ? '+' : ''}{driftDelta.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
