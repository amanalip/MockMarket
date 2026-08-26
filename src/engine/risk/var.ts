export function calculateValueAtRisk(
  dailyReturns: number[],
  confidenceLevel = 0.95
): number {
  if (dailyReturns.length < 5) return 0;

  // Historical simulation approach
  const sorted = [...dailyReturns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidenceLevel) * sorted.length);
  const varReturn = Math.abs(sorted[index]);

  return Number((varReturn * 100).toFixed(2));
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
  if (downsideReturns.length === 0) return Number((annualReturn * 10).toFixed(2));

  const downsideVariance = downsideReturns.reduce((sum, r) => sum + Math.pow(r, 2), 0) / dailyReturns.length;
  const annualDownsideStdDev = Math.sqrt(downsideVariance) * Math.sqrt(252);

  if (annualDownsideStdDev === 0) return 0;

  const sortino = (annualReturn - riskFreeRateAnnual) / annualDownsideStdDev;
  return Number(sortino.toFixed(2));
}
