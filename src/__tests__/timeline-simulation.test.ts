import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore, usePortfolioStore } from '../store';
import { Candle } from '../model/types';
import { filterCandlesByDate, getLatestCandleOnOrBefore } from '../data/loader';

describe('Timeline & Simulation Controls', () => {
  const candles: Candle[] = [
    { time: '2024-01-02', open: 150, high: 155, low: 149, close: 150, volume: 1000 },
    { time: '2024-01-03', open: 151, high: 156, low: 150, close: 155, volume: 1100 },
    { time: '2024-01-04', open: 155, high: 160, low: 154, close: 158, volume: 1200 },
    { time: '2024-01-05', open: 158, high: 162, low: 157, close: 160, volume: 1300 },
  ];

  beforeEach(() => {
    useUIStore.getState().setSimulationDate('2024-01-02');
    usePortfolioStore.getState().resetPortfolio(100000);
  });

  it('updates simulation date and limits visible candles without peeking ahead', () => {
    useUIStore.getState().setSimulationDate('2024-01-03');
    expect(useUIStore.getState().simulationDate).toBe('2024-01-03');

    const visible = filterCandlesByDate(candles, undefined, '2024-01-03');
    expect(visible.length).toBe(2);
    expect(visible[visible.length - 1].time).toBe('2024-01-03');
  });

  it('revalues positions as simulation date moves forward', () => {
    const { executeTrade, updateMarketPrices } = usePortfolioStore.getState();

    // Buy on Jan 2 @ 150
    executeTrade(
      { ticker: 'AAPL', side: 'buy', type: 'market', shares: 10, date: '2024-01-02' },
      candles[0]
    );

    expect(usePortfolioStore.getState().positions['AAPL'].currentValue).toBe(1500);

    // Fast-forward to Jan 5 @ 160
    const latestCandle = getLatestCandleOnOrBefore(candles, '2024-01-05');
    expect(latestCandle).toBeDefined();
    updateMarketPrices({ AAPL: latestCandle!.close });

    const pos = usePortfolioStore.getState().positions['AAPL'];
    expect(pos.currentPrice).toBe(160);
    expect(pos.currentValue).toBe(1600);
    expect(pos.unrealizedPnL).toBe(100);
  });

  it('handles play speed and auto-play state changes', () => {
    const { setIsPlaying, setPlaybackSpeed } = useUIStore.getState();
    setIsPlaying(true);
    expect(useUIStore.getState().isPlaying).toBe(true);

    setPlaybackSpeed(200);
    expect(useUIStore.getState().playbackSpeed).toBe(200);
  });
});
