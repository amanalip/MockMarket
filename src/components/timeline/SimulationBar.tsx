import React, { useEffect, useCallback, useRef } from 'react';
import { useUIStore, usePortfolioStore } from '../../store';
import { Play, Pause, RotateCcw, Calendar as CalendarIcon } from 'lucide-react';
import { Candle } from '../../model/types';
import { loadLatestCandlesOnOrBefore } from '../../data/loader';
import styles from './SimulationBar.module.css';

interface SimulationBarProps {
  candles: Candle[];
}

export const SimulationBar: React.FC<SimulationBarProps> = ({ candles }) => {
  const {
    simulationDate,
    setSimulationDate,
    isPlaying,
    setIsPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    selectedTicker,
    addToast,
  } = useUIStore();

  const {
    updateMarketPrices,
    processCandleForOrders,
    resetPortfolio,
  } = usePortfolioStore();
  const transitionId = useRef(0);

  // Find index of current simulation date in candles – handle beyond last
  const currentIndex = candles.findIndex((c) => c.time === simulationDate);
  const nextOrEqualIdx = candles.findIndex((c) => c.time >= simulationDate);
  const effectiveIndex = currentIndex >= 0
    ? currentIndex
    : nextOrEqualIdx >= 0 ? nextOrEqualIdx : candles.length > 0 ? candles.length - 1 : 0;

  const transitionToDate = useCallback(async (nextDate: string) => {
    if (!setSimulationDate(nextDate)) {
      setIsPlaying(false);
      addToast('Reset the portfolio before rewinding past account activity.', 'error');
      return;
    }

    const requestId = ++transitionId.current;
    const before = usePortfolioStore.getState();
    const tickers = [
      selectedTicker,
      ...Object.keys(before.positions),
      ...before.orders.filter((order) => order.status === 'pending').map((order) => order.ticker),
    ];
    const results = await loadLatestCandlesOnOrBefore(tickers, nextDate);
    if (requestId !== transitionId.current || useUIStore.getState().simulationDate !== nextDate) return;

    Object.values(results).forEach((result) => {
      if (result.status === 'available') processCandleForOrders(result.candle, result.ticker);
    });
    const priceMap = Object.fromEntries(
      Object.values(results)
        .filter((result) => result.status === 'available')
        .map((result) => [result.ticker, result.candle.close])
    );
    updateMarketPrices(priceMap);

    const unavailable = Object.values(results)
      .filter((result) => result.status === 'unavailable')
      .map((result) => result.ticker);
    if (unavailable.length > 0) {
      addToast(`Price unavailable for ${unavailable.join(', ')} on ${nextDate}; previous marks were preserved.`, 'error');
    }

  }, [addToast, processCandleForOrders, selectedTicker, setIsPlaying, setSimulationDate, updateMarketPrices]);

  const advanceByDays = useCallback((stepCount: number) => {
    if (candles.length === 0) return;
    const targetIdx = Math.min(candles.length - 1, effectiveIndex + stepCount);
    const nextCandle = candles[targetIdx];
    if (!nextCandle) return;

    void transitionToDate(nextCandle.time);
  }, [candles, effectiveIndex, transitionToDate]);

  // Auto-play interval
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (isPlaying) {
      interval = setInterval(() => {
        if (effectiveIndex >= candles.length - 1) {
          setIsPlaying(false);
        } else {
          advanceByDays(1);
        }
      }, playbackSpeed);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, effectiveIndex, candles.length, playbackSpeed, advanceByDays, setIsPlaying]);

  const handleReset = () => {
    setIsPlaying(false);
    transitionId.current += 1;
    resetPortfolio(100000);
    if (candles.length > 0) {
      useUIStore.setState({ simulationDate: candles[0].time });
      const firstCandle = candles[0];
      updateMarketPrices({ [selectedTicker]: firstCandle.close });
    } else {
      useUIStore.setState({ simulationDate: '2015-01-02' });
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void transitionToDate(e.target.value);
  };

  return (
    <div className={styles.container}>
      <div className={styles.dateSection}>
        <CalendarIcon size={20} className={styles.calendarIcon} />
        <div className={styles.dateDisplay}>
          <span className={styles.dateLabel}>Simulation Date</span>
          <span className={styles.dateValue}>{simulationDate}</span>
        </div>
        <input
          type="date"
          className={styles.dateInput}
          value={simulationDate}
          min={candles[0]?.time || '2015-01-02'}
          max={candles[candles.length - 1]?.time || '2024-12-31'}
          onChange={handleDateChange}
        />
      </div>

      <div className={styles.controls}>
        <button
          className={styles.playBtn}
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          <span>{isPlaying ? 'Pause' : 'Auto Play'}</span>
        </button>

        <div className={styles.stepGroup}>
          <button className={styles.stepBtn} onClick={() => advanceByDays(1)}>+1 Day</button>
          <button className={styles.stepBtn} onClick={() => advanceByDays(5)}>+1 Week</button>
          <button className={styles.stepBtn} onClick={() => advanceByDays(21)}>+1 Month</button>
          <button className={styles.stepBtn} onClick={() => advanceByDays(63)}>+3 Months</button>
          <button className={styles.stepBtn} onClick={() => advanceByDays(252)}>+1 Year</button>
        </div>

        <select
          className={styles.speedSelect}
          value={playbackSpeed}
          onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
          aria-label="Simulation speed"
        >
          <option value={1000}>1x Speed</option>
          <option value={500}>2x Speed</option>
          <option value={200}>5x Speed</option>
          <option value={50}>10x Speed</option>
        </select>

        <button
          className={styles.stepBtn}
          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
          onClick={handleReset}
          title="Reset portfolio and date"
        >
          <RotateCcw size={14} />
          Reset
        </button>
      </div>
    </div>
  );
};
