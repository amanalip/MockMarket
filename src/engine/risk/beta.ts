export function calculateBeta(portfolioReturns: number[], benchmarkReturns: number[]): number {
  const n = Math.min(portfolioReturns.length, benchmarkReturns.length);
  if (n < 2) return 0;
  if (portfolioReturns.some((v) => !Number.isFinite(v)) || benchmarkReturns.some((v) => !Number.isFinite(v))) return 0;

  const portSlice = portfolioReturns.slice(0, n);
  const benchSlice = benchmarkReturns.slice(0, n);

  const meanPort = portSlice.reduce((sum, r) => sum + r, 0) / n;
  const meanBench = benchSlice.reduce((sum, r) => sum + r, 0) / n;

  let covariance = 0;
  let benchVariance = 0;

  for (let i = 0; i < n; i++) {
    const diffPort = portSlice[i] - meanPort;
    const diffBench = benchSlice[i] - meanBench;
    covariance += diffPort * diffBench;
    benchVariance += diffBench * diffBench;
  }

  if (benchVariance === 0) return 0;

  const beta = covariance / benchVariance;
  return Number(beta.toFixed(2));
}
