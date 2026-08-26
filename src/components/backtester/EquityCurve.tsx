import React from 'react';
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
import { BacktestEquityPoint } from '../../model/types';

interface EquityCurveProps {
  equityCurve: BacktestEquityPoint[];
}

export const EquityCurve: React.FC<EquityCurveProps> = ({ equityCurve }) => {
  if (equityCurve.length === 0) {
    return (
      <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
        Run a backtest to visualize the strategy equity curve.
      </div>
    );
  }

  // Sample points if series is very dense for smooth rendering
  const step = Math.max(1, Math.floor(equityCurve.length / 300));
  const sampledData = equityCurve.filter((_, i) => i % step === 0 || i === equityCurve.length - 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
        Equity Curve vs Buy & Hold vs Benchmark (SPY)
      </span>
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sampledData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
            <XAxis
              dataKey="date"
              stroke="var(--text-muted)"
              fontSize={11}
              tickLine={false}
            />
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
                name === 'strategyValue' ? 'Strategy' : (name === 'buyAndHoldValue' ? 'Buy & Hold' : 'SPY Benchmark'),
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
                  {val === 'strategyValue' ? 'Strategy' : (val === 'buyAndHoldValue' ? 'Buy & Hold' : 'SPY Benchmark')}
                </span>
              )}
            />
            <Line
              type="monotone"
              dataKey="strategyValue"
              stroke="var(--accent)"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="buyAndHoldValue"
              stroke="#10b981"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="benchmarkValue"
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="2 2"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
