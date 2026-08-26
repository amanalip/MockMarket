import { describe, it, expect } from 'vitest';
import {
  toCandlestickData,
  toVolumeData,
  filterCandlesByTimeframe,
} from '../components/charts/chart-utils';
import { Candle } from '../model/types';

describe('Chart Utilities', () => {
  const sampleCandles: Candle[] = [
    { time: '2023-01-03', open: 130, high: 135, low: 128, close: 134, volume: 1000000 },
    { time: '2023-01-04', open: 134, high: 136, low: 131, close: 132, volume: 1200000 },
    { time: '2023-06-01', open: 180, high: 184, low: 179, close: 183, volume: 1500000 },
    { time: '2024-01-02', open: 185, high: 188, low: 184, close: 187, volume: 1400000 },
  ];

  it('converts raw candles to lightweight-charts candlestick series format', () => {
    const data = toCandlestickData(sampleCandles);
    expect(data.length).toBe(4);
    expect(data[0]).toEqual({
      time: '2023-01-03',
      open: 130,
      high: 135,
      low: 128,
      close: 134,
    });
  });

  it('generates volume series with appropriate up/down color tokens', () => {
    const upColor = 'green';
    const downColor = 'red';
    const volData = toVolumeData(sampleCandles, upColor, downColor);

    expect(volData.length).toBe(4);
    // Candle 0: close 134 >= open 130 -> Up (green)
    expect(volData[0].color).toBe('green');
    expect(volData[0].value).toBe(1000000);
    // Candle 1: close 132 < open 134 -> Down (red)
    expect(volData[1].color).toBe('red');
    expect(volData[1].value).toBe(1200000);
  });

  it('filters candles by timeframe correctly', () => {
    const maxResult = filterCandlesByTimeframe(sampleCandles, 'MAX');
    expect(maxResult.length).toBe(4);

    const oneMonthResult = filterCandlesByTimeframe(sampleCandles, '1M', '2024-01-02');
    expect(oneMonthResult.length).toBe(1);
    expect(oneMonthResult[0].time).toBe('2024-01-02');

    const oneYearResult = filterCandlesByTimeframe(sampleCandles, '1Y', '2024-01-02');
    expect(oneYearResult.length).toBe(4);
  });
});
