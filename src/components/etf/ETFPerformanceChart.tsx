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
import { ETFPerformancePoint } from '../../engine/etf/etf-builder';

interface ETFPerformanceChartProps {
  navHistory: ETFPerformancePoint[];
  fundName: string;
}

export const ETFPerformanceChart: React.FC<ETFPerformanceChartProps> = ({
  navHistory,
  fundName,
}) => {
  if (navHistory.length === 0) return null;

  const step = Math.max(1, Math.floor(navHistory.length / 250));
  const sampled = navHistory.filter((_, i) => i % step === 0 || i === navHistory.length - 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
        {fundName} NAV Performance (Base: $100.00)
      </span>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sampled} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
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
              domain={['auto', 'auto']}
              tickFormatter={(val) => `$${val.toFixed(0)}`}
            />
            <Tooltip
              formatter={(val) => [`$${Number(val).toFixed(2)}`, fundName]}
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
              formatter={() => (
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  {fundName} NAV
                </span>
              )}
            />
            <Line
              type="monotone"
              dataKey="nav"
              stroke="var(--accent)"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
