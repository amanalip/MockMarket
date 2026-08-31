import { Candle, TickerInfo } from '../model/types';
import { CORE_TICKERS, getTickerInfo } from '../model/tickers';

const candleCache = new Map<string, Candle[]>();

export type DatedCandleResult =
  | { status: 'available'; ticker: string; targetDate: string; candle: Candle }
  | { status: 'unavailable'; ticker: string; targetDate: string; reason: 'no-candle-on-or-before' | 'load-failed' };

export function clearTickerCache(): void {
  candleCache.clear();
}
export function getTickerCacheSize(): number {
  return candleCache.size;
}

export async function fetchTickers(): Promise<TickerInfo[]> {
  try {
    const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
    const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const safeBase = cleanBase.replace(/([^:])\/\//g, '$1/');
    const res = await fetch(`${safeBase}data/tickers.json`);
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
  if (typeof ticker !== 'string' || !ticker.trim()) throw new Error('Data file not found for ticker: UNKNOWN');
  const upperTicker = ticker.toUpperCase().trim();
  if (upperTicker.includes('..') || upperTicker.includes('/') || upperTicker.includes('\\')) {
    throw new Error(`Data file not found for ticker: ${upperTicker}`);
  }

  if (candleCache.has(upperTicker)) {
    const cached = candleCache.get(upperTicker)!;
    // Return deep copy to prevent mutation of cache
    return cached.map(c => ({ ...c }));
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
  const safeBase = cleanBase.replace(/([^:])\/\//g, '$1/').replace(/^\.\//, '/');
  const url = `${safeBase}data/${subfolder}/${encodeURIComponent(upperTicker)}.json`;

  try {
    const res = await fetch(url);
    if (res && res.ok) {
      const rawCandles: Candle[] = await res.json();
      if (!Array.isArray(rawCandles)) throw new Error(`Data file not found for ticker: ${upperTicker}`);
      const candles = rawCandles.filter(c => c && typeof c.time === 'string' && Number.isFinite(c.close));
      if (candles.length === 0) throw new Error(`Data file not found for ticker: ${upperTicker}`);
      candleCache.set(upperTicker, candles.map(c => ({ ...c })));
      return candles.map(c => ({ ...c }));
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
          const rawCandles: Candle[] = JSON.parse(raw);
          if (!Array.isArray(rawCandles)) throw new Error(`Data file not found for ticker: ${upperTicker}`);
          const candles = rawCandles.filter(c => c && typeof c.time === 'string' && Number.isFinite(c.close));
          if (candles.length === 0) throw new Error(`Data file not found for ticker: ${upperTicker}`);
          candleCache.set(upperTicker, candles.map(c => ({ ...c })));
          return candles.map(c => ({ ...c }));
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
  const validStart = typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate) && !Number.isNaN(new Date(startDate).getTime()) && new Date(startDate).toISOString().slice(0,10) === startDate;
  const validEnd = typeof endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(endDate) && !Number.isNaN(new Date(endDate).getTime()) && new Date(endDate).toISOString().slice(0,10) === endDate;
  return candles.filter((c) => {
    if (!c || typeof c.time !== 'string') return false;
    if (validStart && c.time < startDate!) return false;
    if (validEnd && c.time > endDate!) return false;
    return true;
  });
}

export function getLatestCandleOnOrBefore(
  candles: Candle[],
  targetDate: string
): Candle | undefined {
  if (!Array.isArray(candles) || candles.length === 0) return undefined;
  if (typeof targetDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || Number.isNaN(new Date(targetDate).getTime()) || new Date(targetDate).toISOString().slice(0,10) !== targetDate) return undefined;
  for (let i = candles.length - 1; i >= 0; i--) {
    if (typeof candles[i]?.time === 'string' && candles[i].time <= targetDate) {
      return candles[i];
    }
  }
  return undefined;
}

export async function loadLatestCandlesOnOrBefore(
  tickers: string[],
  targetDate: string
): Promise<Record<string, DatedCandleResult>> {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(targetDate) || Number.isNaN(new Date(targetDate).getTime()) || new Date(targetDate).toISOString().slice(0, 10) !== targetDate) {
    throw new Error(`Invalid target date: ${targetDate}`);
  }

  const uniqueTickers = [...new Set(tickers.map((ticker) => ticker.trim().toUpperCase()).filter(Boolean))];
  const entries = await Promise.all(uniqueTickers.map(async (ticker): Promise<[string, DatedCandleResult]> => {
    try {
      const candles = await loadTickerData(ticker);
      const candle = getLatestCandleOnOrBefore(candles, targetDate);
      return candle
        ? [ticker, { status: 'available', ticker, targetDate, candle }]
        : [ticker, { status: 'unavailable', ticker, targetDate, reason: 'no-candle-on-or-before' }];
    } catch {
      return [ticker, { status: 'unavailable', ticker, targetDate, reason: 'load-failed' }];
    }
  }));

  return Object.fromEntries(entries);
}
