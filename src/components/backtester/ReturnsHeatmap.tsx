import React, { useMemo } from 'react';
import styles from './ReturnsHeatmap.module.css';

interface MonthlyReturnItem {
  year: number;
  month: number;
  returnPercent: number;
}

interface ReturnsHeatmapProps {
  monthlyReturns: MonthlyReturnItem[];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const ReturnsHeatmap: React.FC<ReturnsHeatmapProps> = ({ monthlyReturns }) => {
  const years = useMemo(() => {
    const set = new Set(monthlyReturns.map((r) => r.year));
    return Array.from(set).sort((a, b) => b - a);
  }, [monthlyReturns]);

  const mapByYearMonth = useMemo(() => {
    const map = new Map<string, number>();
    monthlyReturns.forEach((r) => map.set(`${r.year}-${r.month}`, r.returnPercent));
    return map;
  }, [monthlyReturns]);

  const getCellBg = (ret?: number) => {
    if (ret === undefined) return 'transparent';
    if (ret > 0) {
      const alpha = Math.min(0.6, Math.max(0.1, ret / 20));
      return `rgba(16, 185, 129, ${alpha})`;
    } else if (ret < 0) {
      const alpha = Math.min(0.6, Math.max(0.1, Math.abs(ret) / 20));
      return `rgba(239, 68, 68, ${alpha})`;
    }
    return 'rgba(100, 116, 139, 0.1)';
  };

  if (monthlyReturns.length === 0) return null;

  return (
    <div className={styles.container}>
      <span className={styles.title}>Monthly Returns Heatmap (%)</span>
      <div className={styles.tableWrapper} tabIndex={0} aria-label="Monthly returns table, horizontally scrollable">
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Year</th>
              {MONTH_NAMES.map((m) => (
                <th key={m}>{m}</th>
              ))}
              <th>YTD</th>
            </tr>
          </thead>
          <tbody>
            {years.map((year) => {
              let ytdProd = 1;
              let hasMonth = false;

              return (
                <tr key={year}>
                  <td className={styles.yearCell}>{year}</td>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                    const ret = mapByYearMonth.get(`${year}-${month}`);
                    if (ret !== undefined) {
                      ytdProd *= 1 + ret / 100;
                      hasMonth = true;
                    }

                    return (
                      <td
                        key={month}
                        style={{ backgroundColor: getCellBg(ret) }}
                      >
                        {ret !== undefined ? `${ret >= 0 ? '+' : ''}${ret.toFixed(1)}%` : '-'}
                      </td>
                    );
                  })}
                  <td
                    style={{
                      fontWeight: 700,
                      backgroundColor: getCellBg(hasMonth ? (ytdProd - 1) * 100 : undefined),
                    }}
                  >
                    {hasMonth ? `${(ytdProd - 1) >= 0 ? '+' : ''}${(((ytdProd - 1) * 100)).toFixed(1)}%` : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
