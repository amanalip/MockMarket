import { NewsFeed } from '../timeline/NewsFeed';
import { SimulationBar } from '../timeline/SimulationBar';
import { TimeMachineCalculator } from '../timemachine/TimeMachineCalculator';
import type { Candle } from '../../model/types';
import styles from '../../App.module.css';

interface TimelineModeProps {
  candles: Candle[];
}

export default function TimelineMode({ candles }: TimelineModeProps) {
  return (
    <div className={styles.modeStack}>
      <SimulationBar candles={candles} />
      <TimeMachineCalculator />
      <NewsFeed />
    </div>
  );
}
