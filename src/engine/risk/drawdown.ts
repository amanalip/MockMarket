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
  // Ensure sorted by date to avoid wrong peak/trough if unsorted
  const sortedSeries = [...equitySeries].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  let peak = sortedSeries[0].value;
  let peakDate = sortedSeries[0].date;
  let maxDrawdown = 0;
  let maxPeakDate = peakDate;
  let maxTroughDate = peakDate;

  // Validate: peak must be finite, sanitized corrupt values to peak (not 0) to avoid fake 100% drawdown
  let firstValid = sortedSeries.find(pt => Number.isFinite(pt.value) && pt.value >= 0);
  if (!firstValid) {
    firstValid = { date: sortedSeries[0]?.date || '', value: 0 };
  }
  peak = firstValid.value;
  peakDate = firstValid.date;
  const sanitized = sortedSeries.map((pt) => ({
    date: pt.date,
    value: Number.isFinite(pt.value) && pt.value >= 0 ? pt.value : peak,
  }));
  // Ensure peak starts from sanitized first valid
  peak = sanitized[0]?.value ?? 0;
  peakDate = sanitized[0]?.date ?? peakDate;
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
