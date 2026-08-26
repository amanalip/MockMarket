import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { PortfolioSnapshot } from '../../model/types';

interface PortfolioChartProps {
  history: PortfolioSnapshot[];
  startingCash: number;
}

export const PortfolioChart: React.FC<PortfolioChartProps> = ({
  history,
  startingCash,
}) => {
  const chartData = history.length > 0
    ? history
    : [{ date: 'Start', totalValue: startingCash, cash: startingCash, investedValue: 0, dailyPnL: 0, totalPnL: 0 }];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
        Portfolio Net Worth Over Time
      </span>
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="valGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3} />
                <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.0} />
              </linearGradient>
            </defs>
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
              tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(val) => [`$${Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Net Value']}
              contentStyle={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
                borderRadius: '6px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.8rem',
              }}
            />
            <Area
              type="monotone"
              dataKey="totalValue"
              stroke="var(--accent)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#valGrad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
