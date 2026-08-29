import { Position } from '../../model/types';
import { getTickerInfo } from '../../model/tickers';

export interface DiversificationMetrics {
  score: number; // 0 to 100
  sectorConcentrationHHI: number;
  sectorAllocations: { sector: string; value: number; percent: number }[];
  tickerAllocations: { ticker: string; value: number; percent: number }[];
  assetClassAllocations: { assetType: string; value: number; percent: number }[];
}

export function calculateDiversification(
  positions: Record<string, Position>,
  cash: number
): DiversificationMetrics {
  const holdings = Object.values(positions);
  const investedValue = holdings.reduce((sum, p) => sum + p.currentValue, 0);
  const totalPortfolioValue = cash + investedValue;

  if (totalPortfolioValue <= 0) {
    return {
      score: 0,
      sectorConcentrationHHI: 10000,
      sectorAllocations: [],
      tickerAllocations: [],
      assetClassAllocations: [],
    };
  }

  // Ticker breakdown
  const tickerAllocations = holdings.map((p) => ({
    ticker: p.ticker,
    value: p.currentValue,
    percent: Number(((p.currentValue / totalPortfolioValue) * 100).toFixed(2)),
  }));

  if (cash > 0) {
    tickerAllocations.push({
      ticker: 'CASH',
      value: cash,
      percent: Number(((cash / totalPortfolioValue) * 100).toFixed(2)),
    });
  }

  // Sector breakdown
  const sectorMap: Record<string, number> = {};
  const assetTypeMap: Record<string, number> = {};

  holdings.forEach((p) => {
    const info = getTickerInfo(p.ticker);
    const sector = info?.sector || 'Other';
    const assetType = info?.assetType || 'stock';

    sectorMap[sector] = (sectorMap[sector] || 0) + p.currentValue;
    assetTypeMap[assetType] = (assetTypeMap[assetType] || 0) + p.currentValue;
  });

  if (cash > 0) {
    sectorMap['Cash'] = (sectorMap['Cash'] || 0) + cash;
    assetTypeMap['cash'] = (assetTypeMap['cash'] || 0) + cash;
  }

  const sectorAllocations = Object.entries(sectorMap).map(([sector, value]) => ({
    sector,
    value: Number(value.toFixed(2)),
    percent: Number(((value / totalPortfolioValue) * 100).toFixed(2)),
  }));

  const assetClassAllocations = Object.entries(assetTypeMap).map(([assetType, value]) => ({
    assetType,
    value: Number(value.toFixed(2)),
    percent: Number(((value / totalPortfolioValue) * 100).toFixed(2)),
  }));

  // Herfindahl-Hirschman Index (HHI) for Sector Concentration: use precise percentages (not rounded) to avoid drift
  const hhiPrecise = Object.entries(sectorMap).reduce((sum, [, value]) => {
    const precisePercent = (value / totalPortfolioValue) * 100;
    return sum + Math.pow(precisePercent, 2);
  }, 0);
  const hhi = hhiPrecise;

  // Score from 0 to 100 (100 is perfectly diversified, low HHI; 0 is 100% single asset)
  // Perfectly diversified into 10 equal sectors = 10 * 10^2 = 1000 HHI. Single asset = 10000 HHI.
  const rawScore = Math.max(0, Math.min(100, Math.round((10000 - hhi) / 90)));

  return {
    score: rawScore,
    sectorConcentrationHHI: Math.round(hhi),
    sectorAllocations,
    tickerAllocations,
    assetClassAllocations,
  };
}
