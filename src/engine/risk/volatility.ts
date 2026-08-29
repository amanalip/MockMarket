export function calculateReturns(values: number[]): number[] {
  if (values.length < 2) return [];
  const returns: number[] = [];
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1];
    if (!Number.isFinite(prev) || !Number.isFinite(values[i])) {
      returns.push(0);
    } else if (prev > 0) {
      returns.push((values[i] - prev) / prev);
    } else if (prev === 0 && values[i] > 0) {
      returns.push(1);
    } else if (prev === 0 && values[i] === 0) {
      returns.push(0);
    } else {
      returns.push(0);
    }
  }
  return returns;
}

export function calculateAnnualizedVolatility(dailyReturns: number[], tradingDaysPerYear = 252): number {
  if (dailyReturns.length < 2) return 0;

  const mean = dailyReturns.reduce((sum, r) => sum + r, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (dailyReturns.length - 1);
  const dailyStdDev = Math.sqrt(variance);

  const annualized = dailyStdDev * Math.sqrt(tradingDaysPerYear) * 100;
  return Number(annualized.toFixed(2));
}
