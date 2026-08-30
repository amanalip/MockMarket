import React, { useEffect, useCallback } from 'react';
import { useUIStore, usePortfolioStore } from '../../store';
import { Play, Pause, RotateCcw, Calendar as CalendarIcon } from 'lucide-react';
import { Candle, PortfolioSnapshot } from '../../model/types';
import { getLatestCandleOnOrBefore } from '../../data/loader';
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
  } = useUIStore();

  const {
    updateMarketPrices,
    processCandleForOrders,
    resetPortfolio,
  } = usePortfolioStore();

  // Find index of current simulation date in candles – handle beyond last
  const currentIndex = candles.findIndex((c) => c.time === simulationDate);
  const nextOrEqualIdx = candles.findIndex((c) => c.time >= simulationDate);
  const effectiveIndex = currentIndex >= 0
    ? currentIndex
    : nextOrEqualIdx >= 0 ? nextOrEqualIdx : candles.length > 0 ? candles.length - 1 : 0;

  const advanceByDays = useCallback((stepCount: number) => {
    if (candles.length === 0) return;
    const targetIdx = Math.min(candles.length - 1, effectiveIndex + stepCount);
    const nextCandle = candles[targetIdx];
    if (!nextCandle) return;

    const nextDate = nextCandle.time;
    setSimulationDate(nextDate);

    // Revalue active holdings & process pending limit/stop orders – use fresh store values to avoid stale closure
    const fresh = usePortfolioStore.getState();
    const priceMap: Record<string, number> = {
      [selectedTicker]: nextCandle.close,
    };
    // For multi-ticker, revalue all positions with latest known prices (fallback to selected)
    Object.keys(fresh.positions).forEach(tk => {
      if (!(tk in priceMap)) priceMap[tk] = nextCandle.close;
    });
    updateMarketPrices(priceMap);
    processCandleForOrders(nextCandle, selectedTicker);

    // Record snapshot with fresh totals after revalue
    const after = usePortfolioStore.getState();
    const invested = Object.values(after.positions).reduce((sum, p) => sum + p.currentValue, 0);
    const totalVal = after.cash + invested;
    const snapshot: PortfolioSnapshot = {
      date: nextDate,
      cash: after.cash,
      investedValue: invested,
      totalValue: totalVal,
      dailyPnL: 0,
      totalPnL: totalVal - after.startingCash,
    };

    usePortfolioStore.setState((state) => ({
      history: [...state.history.filter((h) => h.date !== nextDate), snapshot],
    }));
  }, [candles, effectiveIndex, setSimulationDate, selectedTicker, updateMarketPrices, processCandleForOrders]);

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
    if (candles.length > 0) {
      setSimulationDate(candles[0].time);
      const firstCandle = candles[0];
      updateMarketPrices({ [selectedTicker]: firstCandle.close });
    } else {
      setSimulationDate('2015-01-02');
    }
    resetPortfolio(100000);
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = e.target.value;
    setSimulationDate(newDate);
    const candle = getLatestCandleOnOrBefore(candles, newDate);
    if (candle) {
      updateMarketPrices({ [selectedTicker]: candle.close });
      processCandleForOrders(candle, selectedTicker);
    }
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
