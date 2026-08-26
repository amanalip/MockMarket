import React from 'react';
import styles from './IndicatorControls.module.css';

export interface ActiveIndicators {
  sma20: boolean;
  sma50: boolean;
  sma200: boolean;
  ema12: boolean;
  ema26: boolean;
  bollinger: boolean;
  volumeMA: boolean;
}

interface IndicatorControlsProps {
  indicators: ActiveIndicators;
  onChange: (updated: ActiveIndicators) => void;
}

export const IndicatorControls: React.FC<IndicatorControlsProps> = ({
  indicators,
  onChange,
}) => {
  const toggle = (key: keyof ActiveIndicators) => {
    onChange({
      ...indicators,
      [key]: !indicators[key],
    });
  };

  return (
    <div className={styles.container}>
      <span className={styles.label}>Indicators:</span>

      <button
        className={`${styles.chip} ${indicators.sma20 ? styles.chipActive : ''}`}
        onClick={() => toggle('sma20')}
      >
        <span className={styles.dot} style={{ backgroundColor: '#38bdf8' }} />
        SMA (20)
      </button>

      <button
        className={`${styles.chip} ${indicators.sma50 ? styles.chipActive : ''}`}
        onClick={() => toggle('sma50')}
      >
        <span className={styles.dot} style={{ backgroundColor: '#fb923c' }} />
        SMA (50)
      </button>

      <button
        className={`${styles.chip} ${indicators.sma200 ? styles.chipActive : ''}`}
        onClick={() => toggle('sma200')}
      >
        <span className={styles.dot} style={{ backgroundColor: '#a855f7' }} />
        SMA (200)
      </button>

      <button
        className={`${styles.chip} ${indicators.ema12 ? styles.chipActive : ''}`}
        onClick={() => toggle('ema12')}
      >
        <span className={styles.dot} style={{ backgroundColor: '#facc15' }} />
        EMA (12)
      </button>

      <button
        className={`${styles.chip} ${indicators.ema26 ? styles.chipActive : ''}`}
        onClick={() => toggle('ema26')}
      >
        <span className={styles.dot} style={{ backgroundColor: '#ec4899' }} />
        EMA (26)
      </button>

      <button
        className={`${styles.chip} ${indicators.bollinger ? styles.chipActive : ''}`}
        onClick={() => toggle('bollinger')}
      >
        <span className={styles.dot} style={{ backgroundColor: '#2dd4bf' }} />
        Bollinger (20, 2)
      </button>

      <button
        className={`${styles.chip} ${indicators.volumeMA ? styles.chipActive : ''}`}
        onClick={() => toggle('volumeMA')}
      >
        <span className={styles.dot} style={{ backgroundColor: '#94a3b8' }} />
        Vol MA (20)
      </button>
    </div>
  );
};
