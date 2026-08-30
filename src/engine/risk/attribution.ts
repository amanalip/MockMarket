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
  if (!positions || typeof positions !== 'object' || Array.isArray(positions)) return [];
  const holdings = Object.values(positions).filter(p => p && typeof p === 'object');
  if (!Number.isFinite(startingCash) || startingCash <= 0 || holdings.length === 0) return [];

  return holdings
    .map((p) => {
      const rawPnL = p.unrealizedPnL + p.realizedPnL;
      const totalPnL = Number.isFinite(rawPnL) ? rawPnL : 0;
      const rawContrib = (totalPnL / startingCash) * 100;
      const contributionPercent = Number.isFinite(rawContrib) ? Number(rawContrib.toFixed(2)) : 0;
      return {
        ticker: p.ticker,
        pnl: Number.isFinite(totalPnL) ? Number(totalPnL.toFixed(2)) : 0,
        contributionPercent,
      };
    })
    .sort((a, b) => b.pnl - a.pnl);
}
