export function calculateValueAtRisk(
  dailyReturns: number[],
  confidenceLevel = 0.95
): number {
  if (dailyReturns.length < 5) return 0;
  if (!Number.isFinite(confidenceLevel) || confidenceLevel <= 0 || confidenceLevel >= 1) return 0;

  // Historical simulation approach with quantile interpolation
  const sorted = [...dailyReturns].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((1 - confidenceLevel) * sorted.length) - 1)
  );
  const varReturn = sorted[index];
  // VaR is positive loss; if worst return is positive (bull market), VaR is 0 not negative
  const varLoss = varReturn < 0 ? Math.abs(varReturn) : 0;

  return Number((varLoss * 100).toFixed(2));
}

export function calculateSharpeRatio(
  dailyReturns: number[],
  riskFreeRateAnnual = 0.04
): number {
  if (dailyReturns.length < 5) return 0;

  const meanDaily = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
  const annualReturn = Math.pow(1 + meanDaily, 252) - 1;

  const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - meanDaily, 2), 0) / (dailyReturns.length - 1);
  const annualStdDev = Math.sqrt(variance) * Math.sqrt(252);

  if (annualStdDev === 0) return 0;

  const sharpe = (annualReturn - riskFreeRateAnnual) / annualStdDev;
  return Number(sharpe.toFixed(2));
}

export function calculateSortinoRatio(
  dailyReturns: number[],
  riskFreeRateAnnual = 0.04
): number {
  if (dailyReturns.length < 5) return 0;

  const meanDaily = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
  const annualReturn = Math.pow(1 + meanDaily, 252) - 1;

  const downsideReturns = dailyReturns.filter((r) => r < 0);
  if (downsideReturns.length === 0) {
    // No downside: Sortino is effectively Sharpe with higher ratio; if annual return positive, Sharpe-like, else 0
    return annualReturn > riskFreeRateAnnual ? Number(((annualReturn - riskFreeRateAnnual) * 10).toFixed(2)) : 0;
  }

  const downsideVariance = downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / downsideReturns.length;
  const annualDownsideStdDev = Math.sqrt(downsideVariance) * Math.sqrt(252);

  if (annualDownsideStdDev === 0) return 0;

  const sortino = (annualReturn - riskFreeRateAnnual) / annualDownsideStdDev;
  return Number(sortino.toFixed(2));
}
