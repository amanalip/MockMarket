import React, { useEffect, useMemo, useState } from 'react';
import { usePortfolioStore } from '../../store';
import { alignPortfolioHistoryWithBenchmark, loadTickerData } from '../../data/loader';
import { Candle } from '../../model/types';
import {
  calculateReturns,
  calculateAnnualizedVolatility,
  calculateBeta,
  calculateMaxDrawdown,
  calculateValueAtRisk,
  calculateDiversification,
  calculatePerformanceAttribution,
} from '../../engine/risk';
import { AllocationDonut } from './AllocationDonut';
import { PortfolioChart } from './PortfolioChart';
import styles from './RiskDashboard.module.css';

export const RiskDashboard: React.FC = () => {
  const { positions, cash, startingCash, history } = usePortfolioStore();
  const [spyCandles, setSpyCandles] = useState<Candle[] | null>(null);
  const [benchmarkError, setBenchmarkError] = useState(false);
  const [benchmarkRetry, setBenchmarkRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setBenchmarkError(false);
    loadTickerData('SPY')
      .then((candles) => {
        if (active) {
          setSpyCandles(candles);
          setBenchmarkError(false);
        }
      })
      .catch(() => {
        if (active) {
          setSpyCandles(null);
          setBenchmarkError(true);
        }
      });
    return () => { active = false; };
  }, [benchmarkRetry]);

  const diversificationMetrics = useMemo(() => {
    return calculateDiversification(positions, cash);
  }, [positions, cash]);

  const attributionList = useMemo(() => {
    return calculatePerformanceAttribution(positions, startingCash);
  }, [positions, startingCash]);

  const equityValues = useMemo(() => {
    if (history.length === 0) return [startingCash];
    return history.map((h) => h.totalValue);
  }, [history, startingCash]);

  const dailyReturns = useMemo(() => {
    return calculateReturns(equityValues);
  }, [equityValues]);

  const volatility = useMemo(() => {
    return calculateAnnualizedVolatility(dailyReturns);
  }, [dailyReturns]);

  const beta = useMemo(() => {
    if (!spyCandles) return null;
    const aligned = alignPortfolioHistoryWithBenchmark(history, spyCandles);
    if (aligned.dates.length < 3) return null;
    return calculateBeta(
      calculateReturns(aligned.portfolioValues),
      calculateReturns(aligned.benchmarkValues)
    );
  }, [history, spyCandles]);

  const maxDrawdown = useMemo(() => {
    const series = history.map((h) => ({ date: h.date, value: h.totalValue }));
    return calculateMaxDrawdown(series);
  }, [history]);

  const var95 = useMemo(() => {
    return calculateValueAtRisk(dailyReturns, 0.95);
  }, [dailyReturns]);

  return (
    <div className={styles.container}>
      {benchmarkError && (
        <div role="alert">
          SPY benchmark data could not be loaded, so beta is unavailable.{' '}
          <button type="button" onClick={() => setBenchmarkRetry((value) => value + 1)}>Retry benchmark</button>
        </div>
      )}
      <div className={styles.header}>
        <span className={styles.title}>Portfolio Risk & Analytics</span>
      </div>

      <div className={styles.riskGrid}>
        <div className={styles.riskCard}>
          <span className={styles.riskLabel}>Diversification Score</span>
          <span className={styles.riskValue} style={{ color: diversificationMetrics.score >= 60 ? 'var(--up-green)' : 'var(--accent)' }}>
            {diversificationMetrics.score} / 100
          </span>
          <span className={styles.riskSub}>HHI: {diversificationMetrics.sectorConcentrationHHI}</span>
        </div>

        <div className={styles.riskCard}>
          <span className={styles.riskLabel}>Portfolio Beta</span>
          <span className={styles.riskValue}>{beta === null ? 'Unavailable' : beta.toFixed(2)}</span>
          <span className={styles.riskSub}>vs S&P 500 benchmark</span>
        </div>

        <div className={styles.riskCard}>
          <span className={styles.riskLabel}>Annualized Volatility</span>
          <span className={styles.riskValue}>{volatility.toFixed(2)}%</span>
          <span className={styles.riskSub}>252 trading days</span>
        </div>

        <div className={styles.riskCard}>
          <span className={styles.riskLabel}>Max Drawdown</span>
          <span className={`${styles.riskValue} ${maxDrawdown.maxDrawdownPercent > 0 ? styles.down : ''}`}>
            -{maxDrawdown.maxDrawdownPercent.toFixed(2)}%
          </span>
          <span className={styles.riskSub}>Peak to trough</span>
        </div>

        <div className={styles.riskCard}>
          <span className={styles.riskLabel}>Daily VaR (95%)</span>
          <span className={styles.riskValue}>{var95.toFixed(2)}%</span>
          <span className={styles.riskSub}>Max 1D expected loss</span>
        </div>
      </div>

      <div className={styles.chartsGrid}>
        <div className={styles.chartCard}>
          <PortfolioChart history={history} startingCash={startingCash} />
        </div>
        <div className={styles.chartCard}>
          <AllocationDonut metrics={diversificationMetrics} />
        </div>
      </div>

      {attributionList.length > 0 && (
        <div className={styles.attributionSection}>
          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Performance Attribution by Holding
          </span>
          <div className={styles.tableWrapper} tabIndex={0} aria-label="Performance attribution table, horizontally scrollable">
          <table className={styles.attributionTable}>
            <thead>
              <tr>
                <th>Ticker</th>
                <th className={styles.numberCol}>Total P&L</th>
                <th className={styles.numberCol}>Contribution to Portfolio</th>
              </tr>
            </thead>
            <tbody>
              {attributionList.map((item) => {
                const isPos = item.pnl >= 0;
                return (
                  <tr key={item.ticker}>
                    <td><strong>{item.ticker}</strong></td>
                    <td className={`${styles.numberCol} ${isPos ? styles.up : styles.down}`}>
                      {isPos ? '+' : ''}${item.pnl.toFixed(2)}
                    </td>
                    <td className={`${styles.numberCol} ${isPos ? styles.up : styles.down}`}>
                      {isPos ? '+' : ''}{item.contributionPercent.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
};
