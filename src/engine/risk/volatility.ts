export function calculateReturns(values: number[]): number[] {
  if (values.length < 2) return [];
  const returns: number[] = [];
  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1];
    const cur = values[i];
    if (!Number.isFinite(prev) || !Number.isFinite(cur)) {
      // Skip corrupt pair instead of faking 0 (which understates volatility)
      continue;
    } else if (prev > 0 && cur >= 0) {
      const r = (cur - prev) / prev;
      if (Number.isFinite(r)) returns.push(r);
    } else if (prev === 0 && cur > 0) {
      returns.push(1);
    } else if (prev === 0 && cur === 0) {
      returns.push(0);
    } else {
      // Negative or corrupt price -> skip, don't fake 0
      continue;
    }
  }
  return returns;
}

export function calculateAnnualizedVolatility(dailyReturns: number[], tradingDaysPerYear = 252): number {
  if (!Array.isArray(dailyReturns) || dailyReturns.length < 2) return 0;
  if (!Number.isFinite(tradingDaysPerYear) || tradingDaysPerYear <= 0) return 0;
  const clean = dailyReturns.filter(v => Number.isFinite(v));
  if (clean.length < 2) return 0;

  const mean = clean.reduce((sum, r) => sum + r, 0) / clean.length;
  const variance = clean.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (clean.length - 1);
  const dailyStdDev = Math.sqrt(variance);

  const annualized = dailyStdDev * Math.sqrt(tradingDaysPerYear) * 100;
  return Number(annualized.toFixed(2));
}
