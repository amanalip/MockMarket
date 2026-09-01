import { CORE_TICKERS } from '../../model/tickers';
import { AppMode, CustomETFConfig, RebalanceFrequency } from '../../model/types';

const SHARE_VERSION = 1;
const MAX_ENCODED_LENGTH = 16_384;
const MAX_JSON_LENGTH = 12_000;
const MAX_RULE_LENGTH = 500;
const MAX_ETF_NAME_LENGTH = 80;
const MAX_ETF_TICKERS = 20;
const MIN_DATE = '2015-01-01';
const MAX_DATE = '2024-12-31';
const MODES: AppMode[] = ['trade', 'backtest', 'etf', 'scenarios', 'timeline'];
const FREQUENCIES: RebalanceFrequency[] = ['monthly', 'quarterly', 'annually', 'never'];
const ALLOWED_TICKERS = new Set(CORE_TICKERS.map(({ ticker }) => ticker));

export interface ShareableStatePayload {
  version: 1;
  mode?: AppMode;
  ticker?: string;
  date?: string;
  cash?: number;
  etf?: {
    name: string;
    tickers: { ticker: string; targetWeight: number }[];
    rebalanceFrequency: RebalanceFrequency;
  };
  backtest?: {
    ticker: string;
    startDate?: string;
    endDate?: string;
    initialCash?: number;
    positionSizePercent?: number;
    entryRule: string;
    exitRule: string;
    stopLossPercent?: number;
    takeProfitPercent?: number;
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function isDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === value
    && value >= MIN_DATE
    && value <= MAX_DATE;
}

function isISODate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isNumberInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

function isTicker(value: unknown): value is string {
  return typeof value === 'string' && ALLOWED_TICKERS.has(value);
}

function isETFConstituent(value: unknown): value is { ticker: string; targetWeight: number } {
  return isPlainObject(value)
    && hasOnlyKeys(value, ['ticker', 'targetWeight'])
    && isTicker(value.ticker)
    && isNumberInRange(value.targetWeight, 0.01, 100);
}

function isShareETF(value: unknown): value is NonNullable<ShareableStatePayload['etf']> {
  if (!isPlainObject(value) || !hasOnlyKeys(value, ['name', 'tickers', 'rebalanceFrequency'])) return false;
  if (typeof value.name !== 'string' || !value.name.trim() || value.name.length > MAX_ETF_NAME_LENGTH) return false;
  if (!Array.isArray(value.tickers) || value.tickers.length === 0 || value.tickers.length > MAX_ETF_TICKERS) return false;
  if (!value.tickers.every(isETFConstituent)) return false;
  const symbols = value.tickers.map(({ ticker }) => ticker);
  if (new Set(symbols).size !== symbols.length) return false;
  const total = value.tickers.reduce((sum, item) => sum + item.targetWeight, 0);
  return Math.abs(total - 100) <= 0.011
    && typeof value.rebalanceFrequency === 'string'
    && FREQUENCIES.includes(value.rebalanceFrequency as RebalanceFrequency);
}

function isBacktest(value: unknown): value is NonNullable<ShareableStatePayload['backtest']> {
  const keys = ['ticker', 'startDate', 'endDate', 'initialCash', 'positionSizePercent', 'entryRule', 'exitRule', 'stopLossPercent', 'takeProfitPercent'];
  if (!isPlainObject(value) || !hasOnlyKeys(value, keys) || !isTicker(value.ticker)) return false;
  if (typeof value.entryRule !== 'string' || !value.entryRule.trim() || value.entryRule.length > MAX_RULE_LENGTH) return false;
  if (typeof value.exitRule !== 'string' || !value.exitRule.trim() || value.exitRule.length > MAX_RULE_LENGTH) return false;
  if (value.startDate !== undefined && !isDate(value.startDate)) return false;
  if (value.endDate !== undefined && !isDate(value.endDate)) return false;
  if (typeof value.startDate === 'string' && typeof value.endDate === 'string' && value.startDate > value.endDate) return false;
  if (value.initialCash !== undefined && !isNumberInRange(value.initialCash, 1_000, 1_000_000_000)) return false;
  if (value.positionSizePercent !== undefined && !isNumberInRange(value.positionSizePercent, 1, 100)) return false;
  if (value.stopLossPercent !== undefined && !isNumberInRange(value.stopLossPercent, 0, 100)) return false;
  return value.takeProfitPercent === undefined || isNumberInRange(value.takeProfitPercent, 0, 1_000);
}

export function validateShareState(value: unknown): value is ShareableStatePayload {
  if (!isPlainObject(value)) return false;
  if (!hasOnlyKeys(value, ['version', 'mode', 'ticker', 'date', 'cash', 'etf', 'backtest'])) return false;
  if (value.version !== SHARE_VERSION) return false;
  if (value.mode !== undefined && (typeof value.mode !== 'string' || !MODES.includes(value.mode as AppMode))) return false;
  if (value.ticker !== undefined && !isTicker(value.ticker)) return false;
  if (value.date !== undefined && !isDate(value.date)) return false;
  if (value.cash !== undefined && !isNumberInRange(value.cash, 0, 1_000_000_000)) return false;
  if (value.etf !== undefined && !isShareETF(value.etf)) return false;
  if (value.backtest !== undefined && !isBacktest(value.backtest)) return false;
  if (value.mode === 'etf') return value.backtest === undefined;
  if (value.mode === 'backtest') return value.etf === undefined;
  if (value.mode !== undefined) return value.etf === undefined && value.backtest === undefined;
  return value.etf === undefined || value.backtest === undefined;
}

export function validateSavedETF(value: unknown): value is CustomETFConfig {
  if (!isPlainObject(value) || !hasOnlyKeys(value, ['id', 'name', 'tickers', 'rebalanceFrequency', 'createdAt'])) return false;
  if (typeof value.id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(value.id)) return false;
  return isISODate(value.createdAt) && isShareETF({
    name: value.name,
    tickers: value.tickers,
    rebalanceFrequency: value.rebalanceFrequency,
  });
}

export function encodeShareState(payload: ShareableStatePayload): string {
  try {
    if (!validateShareState(payload)) return '';
    const jsonStr = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(jsonStr);
    let binary = '';
    bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
    return encodeURIComponent(globalThis.btoa(binary));
  } catch {
    return '';
  }
}

export function decodeShareState(encodedStr: string): ShareableStatePayload | null {
  try {
    if (!encodedStr || encodedStr.length > MAX_ENCODED_LENGTH) return null;
    const cleanStr = decodeURIComponent(encodedStr);
    const binary = globalThis.atob(cleanStr);
    const jsonStr = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
    if (jsonStr.length > MAX_JSON_LENGTH) return null;
    const payload: unknown = JSON.parse(jsonStr);
    return validateShareState(payload) ? payload : null;
  } catch {
    return null;
  }
}

export function generateShareableLink(payload: ShareableStatePayload): string {
  const hash = encodeShareState(payload);
  if (!hash) return '';
  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin || ''}${window.location.pathname || ''}#share=${hash}`;
  }
  return `https://mockmarket.app/#share=${hash}`;
}
