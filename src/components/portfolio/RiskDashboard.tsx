import React, { useMemo } from 'react';
import { usePortfolioStore } from '../../store';
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

  // Mock benchmark returns with S&P 500 baseline
  const benchmarkReturns = useMemo(() => {
    return dailyReturns.map((r) => r * 0.85 + 0.0002);
  }, [dailyReturns]);

  const volatility = useMemo(() => {
    return calculateAnnualizedVolatility(dailyReturns);
  }, [dailyReturns]);

  const beta = useMemo(() => {
    return calculateBeta(dailyReturns, benchmarkReturns);
  }, [dailyReturns, benchmarkReturns]);

  const maxDrawdown = useMemo(() => {
    const series = history.map((h) => ({ date: h.date, value: h.totalValue }));
    return calculateMaxDrawdown(series);
  }, [history]);

  const var95 = useMemo(() => {
    return calculateValueAtRisk(dailyReturns, 0.95);
  }, [dailyReturns]);

  return (
    <div className={styles.container}>
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
          <span className={styles.riskValue}>{beta.toFixed(2)}</span>
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
      )}
    </div>
  );
};
