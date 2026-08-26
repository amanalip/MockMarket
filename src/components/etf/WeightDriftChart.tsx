import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { ETFDriftPoint } from '../../engine/etf/etf-builder';

interface WeightDriftChartProps {
  driftHistory: ETFDriftPoint[];
  tickers: string[];
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6',
  '#06b6d4', '#f97316', '#64748b', '#14b8a6', '#a855f7',
];

export const WeightDriftChart: React.FC<WeightDriftChartProps> = ({
  driftHistory,
  tickers,
}) => {
  if (driftHistory.length === 0) return null;

  const step = Math.max(1, Math.floor(driftHistory.length / 250));
  const sampled = driftHistory
    .filter((_, i) => i % step === 0 || i === driftHistory.length - 1)
    .map((pt) => ({
      date: pt.date,
      ...pt.weights,
    }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
        Constituent Weight Drift Over Time (Stacked %)
      </span>
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sampled} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
              domain={[0, 100]}
              tickFormatter={(val) => `${val}%`}
            />
            <Tooltip
              formatter={(val, name) => [`${Number(val).toFixed(1)}%`, name]}
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
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{val}</span>
              )}
            />
            {tickers.map((ticker, index) => (
              <Area
                key={ticker}
                type="monotone"
                dataKey={ticker}
                stackId="1"
                stroke={COLORS[index % COLORS.length]}
                fill={COLORS[index % COLORS.length]}
                fillOpacity={0.7}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
