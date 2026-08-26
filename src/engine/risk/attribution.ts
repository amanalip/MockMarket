import { Position } from '../../model/types';

export interface PerformanceAttribution {
  ticker: string;
  pnl: number;
  contributionPercent: number;
}

export function calculatePerformanceAttribution(
  positions: Record<string, Position>,
  startingCash: number
): PerformanceAttribution[] {
  const holdings = Object.values(positions);
  if (startingCash <= 0 || holdings.length === 0) return [];

  return holdings
    .map((p) => {
      const totalPnL = p.unrealizedPnL + p.realizedPnL;
      const contributionPercent = Number(((totalPnL / startingCash) * 100).toFixed(2));
      return {
        ticker: p.ticker,
        pnl: Number(totalPnL.toFixed(2)),
        contributionPercent,
      };
    })
    .sort((a, b) => b.pnl - a.pnl);
}
