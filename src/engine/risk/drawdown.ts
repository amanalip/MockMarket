export interface DrawdownResult {
  maxDrawdownPercent: number;
  peakDate: string;
  troughDate: string;
  drawdownSeries: { date: string; drawdownPercent: number }[];
}

export function calculateMaxDrawdown(
  equitySeries: { date: string; value: number }[]
): DrawdownResult {
  if (equitySeries.length === 0) {
    return { maxDrawdownPercent: 0, peakDate: '', troughDate: '', drawdownSeries: [] };
  }

  let peak = equitySeries[0].value;
  let peakDate = equitySeries[0].date;
  let maxDrawdown = 0;
  let maxPeakDate = peakDate;
  let maxTroughDate = peakDate;

  // Validate and sanitize equity series
  const sanitized = equitySeries.map((pt) => ({
    date: pt.date,
    value: Number.isFinite(pt.value) && pt.value >= 0 ? pt.value : 0,
  }));
  const drawdownSeries = sanitized.map((pt) => {
    if (pt.value > peak) {
      peak = pt.value;
      peakDate = pt.date;
    }

    const dd = peak > 0 ? ((peak - pt.value) / peak) * 100 : 0;
    if (dd > maxDrawdown) {
      maxDrawdown = dd;
      maxPeakDate = peakDate;
      maxTroughDate = pt.date;
    }

    return {
      date: pt.date,
      drawdownPercent: Number(dd.toFixed(2)),
    };
  });

  return {
    maxDrawdownPercent: Number(maxDrawdown.toFixed(2)),
    peakDate: maxPeakDate,
    troughDate: maxTroughDate,
    drawdownSeries,
  };
}
