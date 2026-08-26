import React, { useState } from 'react';
import { useUIStore } from '../../store';
import { CORE_TICKERS } from '../../model/tickers';
import { loadTickerData } from '../../data/loader';
import {
  calculateTimeMachine,
  TimeMachineConfig,
  TimeMachineResult,
  DCAInterval,
} from '../../engine/timemachine/timemachine';
import { History, Sparkles } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import styles from './TimeMachineCalculator.module.css';

export const TimeMachineCalculator: React.FC = () => {
  const { addToast } = useUIStore();

  const [ticker, setTicker] = useState('AAPL');
  const [startDate, setStartDate] = useState('2016-01-04');
  const [endDate, setEndDate] = useState('2024-12-31');
  const [initialAmount, setInitialAmount] = useState(10000);
  const [dcaAmount, setDcaAmount] = useState(250);
  const [dcaInterval, setDcaInterval] = useState<DCAInterval>('monthly');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TimeMachineResult | null>(null);

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const [tickerCandles, spyCandles] = await Promise.all([
        loadTickerData(ticker),
        loadTickerData('SPY'),
      ]);

      const config: TimeMachineConfig = {
        ticker,
        startDate,
        endDate,
        initialAmount,
        dcaAmount: dcaInterval !== 'none' ? dcaAmount : 0,
        dcaInterval,
      };

      const res = calculateTimeMachine(tickerCandles, spyCandles, config);
      setResult(res);
      addToast(`Calculated: $${initialAmount.toLocaleString()} in ${ticker} grew to $${res.finalAssetValue.toLocaleString()} (${res.totalReturnPercent.toFixed(1)}%).`, 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Calculation error occurred.';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const isPos = result ? result.totalReturnPercent >= 0 : true;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <span className={styles.title}>Investment Time Machine</span>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Simulate historical lumpsum and dollar-cost averaging returns vs the S&P 500.
          </div>
        </div>
      </div>

      <div className={styles.formGrid}>
        <div className={styles.formGroup}>
          <label className={styles.label}>Asset Ticker</label>
          <select
            className={styles.input}
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
          >
            {CORE_TICKERS.map((t) => (
              <option key={t.ticker} value={t.ticker}>
                {t.ticker} - {t.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Investment Start Date</label>
          <input
            type="date"
            className={styles.input}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>End Date</label>
          <input
            type="date"
            className={styles.input}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Initial Capital ($)</label>
          <input
            type="number"
            min="100"
            step="500"
            className={styles.input}
            value={initialAmount}
            onChange={(e) => setInitialAmount(Number(e.target.value))}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Recurring DCA Amount ($)</label>
          <input
            type="number"
            min="0"
            step="50"
            className={styles.input}
            value={dcaAmount}
            onChange={(e) => setDcaAmount(Number(e.target.value))}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>DCA Frequency</label>
          <select
            className={styles.input}
            value={dcaInterval}
            onChange={(e) => setDcaInterval(e.target.value as DCAInterval)}
          >
            <option value="none">Lump Sum Only (No DCA)</option>
            <option value="weekly">Weekly Recurring</option>
            <option value="monthly">Monthly Recurring</option>
          </select>
        </div>
      </div>

      <button
        type="button"
        className={styles.submitBtn}
        onClick={handleCalculate}
        disabled={loading}
      >
        <History size={18} />
        <span>{loading ? 'Replaying Historical Price Cycles...' : 'Run Time Machine Simulation'}</span>
      </button>

      {result && (
        <div className={styles.resultsSection}>
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>Final Portfolio Value</span>
              <span className={`${styles.statValue} ${isPos ? styles.up : styles.down}`}>
                ${result.finalAssetValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={styles.statSub}>Total Invested: ${result.totalCashInvested.toLocaleString()}</span>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>Total Return</span>
              <span className={`${styles.statValue} ${isPos ? styles.up : styles.down}`}>
                {isPos ? '+' : ''}{result.totalReturnPercent.toFixed(2)}%
              </span>
              <span className={styles.statSub}>Profit: ${result.totalProfitDollars.toLocaleString()}</span>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>CAGR (Annual Return)</span>
              <span className={`${styles.statValue} ${isPos ? styles.up : styles.down}`}>
                {isPos ? '+' : ''}{result.cagrPercent.toFixed(2)}%
              </span>
              <span className={styles.statSub}>Compound annual rate</span>
            </div>

            <div className={styles.statCard}>
              <span className={styles.statLabel}>SPY Benchmark Value</span>
              <span className={`${styles.statValue} ${result.benchmarkReturnPercent >= 0 ? styles.up : styles.down}`}>
                ${result.finalBenchmarkValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={styles.statSub}>SPY Return: {result.benchmarkReturnPercent >= 0 ? '+' : ''}{result.benchmarkReturnPercent.toFixed(2)}%</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Growth of Investment vs SPY vs Cash Invested
            </span>
            <div style={{ width: '100%', height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={result.growthCurve.filter((_, i) => i % Math.max(1, Math.floor(result.growthCurve.length / 250)) === 0 || i === result.growthCurve.length - 1)}
                  margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                  <YAxis
                    stroke="var(--text-muted)"
                    fontSize={11}
                    tickLine={false}
                    tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip
                    formatter={(val, name) => [
                      `$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      name === 'assetValue' ? ticker : (name === 'benchmarkValue' ? 'SPY Benchmark' : 'Cash Contributed'),
                    ]}
                    contentStyle={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border)',
                      color: 'var(--text-primary)',
                      borderRadius: '6px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.8rem',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(val) => (
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                        {val === 'assetValue' ? `${ticker} Position` : (val === 'benchmarkValue' ? 'SPY Benchmark' : 'Cash Contributed')}
                      </span>
                    )}
                  />
                  <Line type="monotone" dataKey="assetValue" stroke="var(--accent)" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="benchmarkValue" stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                  <Line type="monotone" dataKey="investedCash" stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="2 2" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {result.milestones.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} color="var(--accent)" />
                <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>Holding Period Milestones</span>
              </div>
              <div className={styles.milestonesList}>
                {result.milestones.map((m, idx) => (
                  <div key={idx} className={styles.milestoneCard}>
                    <span className={styles.milestoneTitle}>{m.title}</span>
                    <span className={styles.milestoneDate}>{m.date}</span>
                    <span className={styles.milestoneDesc}>{m.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
