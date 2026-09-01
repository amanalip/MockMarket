import { BacktestConfigPanel } from '../backtester/BacktestConfigPanel';
import { BacktestResults } from '../backtester/BacktestResults';
import styles from '../../App.module.css';

export default function BacktestMode() {
  return (
    <div className={styles.modeStack}>
      <BacktestConfigPanel />
      <BacktestResults />
    </div>
  );
}
