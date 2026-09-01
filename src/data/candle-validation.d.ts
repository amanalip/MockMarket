import type { Candle } from '../model/types';

export function isIsoDate(value: unknown): value is string;
export function validateCandles(value: unknown, context?: string): Candle[];
