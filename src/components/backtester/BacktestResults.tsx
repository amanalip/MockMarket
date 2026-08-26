import React from 'react';
import { useBacktesterStore } from '../../store';
import { EquityCurve } from './EquityCurve';
import { ReturnsHeatmap } from './ReturnsHeatmap';
import { BacktestTradesTable } from './BacktestTradesTable';
import styles from './BacktestResults.module.css';

export const BacktestResults: React.FC = () => {
  const { result } = useBacktesterStore();

  if (!result) return null;
  const { stats, trades, equityCurve, monthlyReturns } = result;
  const isPos = stats.totalReturnPercent >= 0;

  return (
    <div className={styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 700 }}>Backtest Results</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          {result.config.ticker} | {result.config.startDate} to {result.config.endDate}
        </span>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.card}>
          <span className={styles.label}>Strategy Return</span>
          <span className={`${styles.value} ${isPos ? styles.up : styles.down}`}>
            {isPos ? '+' : ''}{stats.totalReturnPercent.toFixed(2)}%
          </span>
          <span className={styles.sub}>CAGR: {stats.cagrPercent.toFixed(2)}%</span>
        </div>

        <div className={styles.card}>
          <span className={styles.label}>SPY Benchmark</span>
          <span className={`${styles.value} ${stats.benchmarkReturnPercent >= 0 ? styles.up : styles.down}`}>
            {stats.benchmarkReturnPercent >= 0 ? '+' : ''}{stats.benchmarkReturnPercent.toFixed(2)}%
          </span>
          <span className={styles.sub}>S&P 500 ETF</span>
        </div>

        <div className={styles.card}>
          <span className={styles.label}>Win Rate</span>
          <span className={styles.value}>{stats.winRatePercent.toFixed(1)}%</span>
          <span className={styles.sub}>{stats.winningTrades}W / {stats.losingTrades}L ({stats.totalTrades} total)</span>
        </div>

        <div className={styles.card}>
          <span className={styles.label}>Profit Factor</span>
          <span className={styles.value}>{stats.profitFactor.toFixed(2)}</span>
          <span className={styles.sub}>Gains / Losses</span>
        </div>

        <div className={styles.card}>
          <span className={styles.label}>Sharpe Ratio</span>
          <span className={styles.value}>{stats.sharpeRatio.toFixed(2)}</span>
          <span className={styles.sub}>Sortino: {stats.sortinoRatio.toFixed(2)}</span>
        </div>

        <div className={styles.card}>
          <span className={styles.label}>Max Drawdown</span>
          <span className={`${styles.value} ${stats.maxDrawdownPercent > 0 ? styles.down : ''}`}>
            -{stats.maxDrawdownPercent.toFixed(2)}%
          </span>
          <span className={styles.sub}>Peak to trough</span>
        </div>
      </div>

      <EquityCurve equityCurve={equityCurve} />

      <ReturnsHeatmap monthlyReturns={monthlyReturns} />

      <BacktestTradesTable trades={trades} />
    </div>
  );
};
