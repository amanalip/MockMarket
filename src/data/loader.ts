import { Candle, TickerInfo } from '../model/types';
import { CORE_TICKERS, getTickerInfo } from '../model/tickers';

const candleCache = new Map<string, Candle[]>();

export async function fetchTickers(): Promise<TickerInfo[]> {
  try {
    const baseUrl = import.meta.env.BASE_URL || '/';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const res = await fetch(`${cleanBase}data/tickers.json`);
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Fall back to built-in metadata
  }
  return CORE_TICKERS;
}

export async function loadTickerData(ticker: string): Promise<Candle[]> {
  const upperTicker = ticker.toUpperCase();

  if (candleCache.has(upperTicker)) {
    return candleCache.get(upperTicker)!;
  }

  const info = getTickerInfo(upperTicker);
  let subfolder = 'stocks';
  if (info?.assetType === 'etf') {
    subfolder = 'etfs';
  } else if (info?.assetType === 'crypto') {
    subfolder = 'crypto';
  }

  const baseUrl = import.meta.env.BASE_URL || '/';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const url = `${cleanBase}data/${subfolder}/${upperTicker}.json`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      // Try alternative subfolders if not found
      for (const fallback of ['stocks', 'etfs', 'crypto']) {
        if (fallback === subfolder) continue;
        const fallbackUrl = `${cleanBase}data/${fallback}/${upperTicker}.json`;
        const fbRes = await fetch(fallbackUrl);
        if (fbRes.ok) {
          const candles: Candle[] = await fbRes.json();
          candleCache.set(upperTicker, candles);
          return candles;
        }
      }
      throw new Error(`Data file not found for ticker: ${upperTicker}`);
    }

    const candles: Candle[] = await res.json();
    candleCache.set(upperTicker, candles);
    return candles;
  } catch (err) {
    console.error(`Failed to load historical data for ${upperTicker}:`, err);
    throw err;
  }
}

export function filterCandlesByDate(
  candles: Candle[],
  startDate?: string,
  endDate?: string
): Candle[] {
  return candles.filter((c) => {
    if (startDate && c.time < startDate) return false;
    if (endDate && c.time > endDate) return false;
    return true;
  });
}

export function getLatestCandleOnOrBefore(
  candles: Candle[],
  date: string
): Candle | undefined {
  for (let i = candles.length - 1; i >= 0; i--) {
    if (candles[i].time <= date) {
      return candles[i];
    }
  }
  return candles[0];
}
