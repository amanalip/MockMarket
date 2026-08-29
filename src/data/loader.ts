import { Candle, TickerInfo } from '../model/types';
import { CORE_TICKERS, getTickerInfo } from '../model/tickers';

const candleCache = new Map<string, Candle[]>();

export async function fetchTickers(): Promise<TickerInfo[]> {
  try {
    const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
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

  const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const url = `${cleanBase}data/${subfolder}/${upperTicker}.json`;

  try {
    const res = await fetch(url);
    if (res && res.ok) {
      const candles: Candle[] = await res.json();
      candleCache.set(upperTicker, candles);
      return candles;
    }
  } catch {
    // Attempt local Node fs fallback for testing environments
    const globalObj = globalThis as unknown as { process?: { cwd?: () => string; versions?: { node?: string } } };
    if (globalObj.process?.versions?.node) {
      try {
        const fsModule = 'node:fs';
        const pathModule = 'node:path';
        const fs = await import(/* @vite-ignore */ fsModule);
        const path = await import(/* @vite-ignore */ pathModule);
        const cwd = globalObj.process.cwd?.() || '.';
        const filePath = path.resolve(cwd, `public/data/${subfolder}/${upperTicker}.json`);
        if (fs.existsSync(filePath)) {
          const raw = fs.readFileSync(filePath, 'utf8');
          const candles: Candle[] = JSON.parse(raw);
          candleCache.set(upperTicker, candles);
          return candles;
        }
      } catch {
        // Fall through to error
      }
    }
  }

  throw new Error(`Data file not found for ticker: ${upperTicker}`);
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
  targetDate: string
): Candle | undefined {
  if (candles.length === 0) return undefined;
  for (let i = candles.length - 1; i >= 0; i--) {
    if (candles[i].time <= targetDate) {
      return candles[i];
    }
  }
  return undefined;
}
