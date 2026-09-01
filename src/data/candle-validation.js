const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value) {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function validateCandles(value, context = 'candle data') {
  if (!Array.isArray(value)) {
    throw new Error(`${context}: expected an array of candles`);
  }
  if (value.length === 0) {
    throw new Error(`${context}: expected at least one candle`);
  }

  let previousDate;
  return value.map((candidate, index) => {
    const prefix = `${context}: candle ${index}`;
    if (candidate === null || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new Error(`${prefix} must be an object`);
    }

    if (!isIsoDate(candidate.time)) {
      throw new Error(`${prefix} has invalid time ${JSON.stringify(candidate.time)}; expected YYYY-MM-DD`);
    }

    for (const field of ['open', 'high', 'low', 'close']) {
      if (typeof candidate[field] !== 'number' || !Number.isFinite(candidate[field]) || candidate[field] <= 0) {
        throw new Error(`${prefix} field ${field} must be a finite positive number`);
      }
    }
    if (typeof candidate.volume !== 'number' || !Number.isFinite(candidate.volume) || candidate.volume < 0) {
      throw new Error(`${prefix} field volume must be a finite nonnegative number`);
    }
    if (candidate.high < Math.max(candidate.open, candidate.close)) {
      throw new Error(`${prefix} high must be greater than or equal to open and close`);
    }
    if (candidate.low > Math.min(candidate.open, candidate.close)) {
      throw new Error(`${prefix} low must be less than or equal to open and close`);
    }

    if (previousDate !== undefined && candidate.time <= previousDate) {
      const reason = candidate.time === previousDate ? 'duplicate' : 'unsorted';
      throw new Error(`${prefix} has ${reason} time ${candidate.time}; dates must be strictly ascending and unique`);
    }
    previousDate = candidate.time;

    return {
      time: candidate.time,
      open: candidate.open,
      high: candidate.high,
      low: candidate.low,
      close: candidate.close,
      volume: candidate.volume,
    };
  });
}
