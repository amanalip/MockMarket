import React, { useState } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { DiversificationMetrics } from '../../engine/risk/diversification';

interface AllocationDonutProps {
  metrics: DiversificationMetrics;
}

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6',
  '#06b6d4', '#f97316', '#64748b', '#14b8a6', '#a855f7',
];

export const AllocationDonut: React.FC<AllocationDonutProps> = ({ metrics }) => {
  const [viewType, setViewType] = useState<'sector' | 'ticker' | 'asset'>('sector');

  let data: { name: string; value: number }[];
  if (viewType === 'sector') {
    data = metrics.sectorAllocations.map((s) => ({ name: s.sector, value: s.percent }));
  } else if (viewType === 'ticker') {
    data = metrics.tickerAllocations.map((t) => ({ name: t.ticker, value: t.percent }));
  } else {
    data = metrics.assetClassAllocations.map((a) => ({ name: a.assetType.toUpperCase(), value: a.percent }));
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Portfolio Allocation
        </span>
        <div style={{ display: 'flex', gap: '4px' }}>
          {(['sector', 'ticker', 'asset'] as const).map((vt) => (
            <button
              key={vt}
              style={{
                background: viewType === vt ? 'var(--accent-solid)' : 'var(--bg-card)',
                color: viewType === vt ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                padding: '3px 8px',
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'capitalize',
              }}
              onClick={() => setViewType(vt)}
              aria-pressed={viewType === vt}
            >
              {vt}
            </button>
          ))}
        </div>
      </div>

      {data.length === 0 ? (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          No positions available to plot allocation.
        </div>
      ) : (
        <div style={{ width: '100%', height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                innerRadius={55}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
              >
                {data.map((item, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={COLORS[index % COLORS.length]}
                    aria-label={`${item.name}: ${item.value.toFixed(1)}%`}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(val) => [`${Number(val).toFixed(1)}%`, 'Weight']}
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
                formatter={(val) => <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{val}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
