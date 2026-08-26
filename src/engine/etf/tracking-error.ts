import { calculateReturns, calculateAnnualizedVolatility } from '../risk/volatility';

export interface TrackingErrorResult {
  trackingErrorPercent: number;
  correlation: number;
}

export function calculateTrackingError(
  customNavSeries: number[],
  benchmarkNavSeries: number[]
): TrackingErrorResult {
  const n = Math.min(customNavSeries.length, benchmarkNavSeries.length);
  if (n < 5) return { trackingErrorPercent: 0, correlation: 1 };

  const customReturns = calculateReturns(customNavSeries.slice(0, n));
  const benchReturns = calculateReturns(benchmarkNavSeries.slice(0, n));

  const returnDiffs = customReturns.map((r, i) => r - benchReturns[i]);
  const trackingError = calculateAnnualizedVolatility(returnDiffs);

  // Pearson correlation
  const meanC = customReturns.reduce((sum, r) => sum + r, 0) / customReturns.length;
  const meanB = benchReturns.reduce((sum, r) => sum + r, 0) / benchReturns.length;

  let num = 0;
  let denC = 0;
  let denB = 0;

  for (let i = 0; i < customReturns.length; i++) {
    const diffC = customReturns[i] - meanC;
    const diffB = benchReturns[i] - meanB;
    num += diffC * diffB;
    denC += diffC * diffC;
    denB += diffB * diffB;
  }

  const den = Math.sqrt(denC * denB);
  const correlation = den > 0 ? Number((num / den).toFixed(2)) : 0;

  return {
    trackingErrorPercent: trackingError,
    correlation,
  };
}
