import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  IChartApi,
  ISeriesApi,
} from 'lightweight-charts';
import { Candle } from '../../model/types';
import { getTheme, ThemeMode } from '../../theme';
import {
  Timeframe,
  toCandlestickData,
  toVolumeData,
  filterCandlesByTimeframe,
} from './chart-utils';
import styles from './CandlestickChart.module.css';

interface CandlestickChartProps {
  candles: Candle[];
  ticker: string;
  theme: ThemeMode;
  loading?: boolean;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  candles,
  ticker,
  theme,
  loading = false,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const [timeframe, setTimeframe] = useState<Timeframe>('1Y');
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;
    const colors = getTheme(theme);

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 420,
      layout: {
        background: { type: ColorType.Solid, color: colors.chartBackground },
        textColor: colors.chartText,
        fontSize: 12,
        fontFamily: 'JetBrains Mono, monospace',
      },
      grid: {
        vertLines: { color: colors.chartGrid },
        horzLines: { color: colors.chartGrid },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: colors.chartCrosshair,
          width: 1,
          style: 3,
          labelBackgroundColor: colors.bgCard,
        },
        horzLine: {
          color: colors.chartCrosshair,
          width: 1,
          style: 3,
          labelBackgroundColor: colors.bgCard,
        },
      },
      rightPriceScale: {
        borderColor: colors.border,
        scaleMargins: {
          top: 0.1,
          bottom: 0.25,
        },
      },
      timeScale: {
        borderColor: colors.border,
        timeVisible: true,
        secondsVisible: false,
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: colors.upGreen,
      downColor: colors.downRed,
      borderVisible: false,
      wickUpColor: colors.upGreen,
      wickDownColor: colors.downRed,
    });

    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: colors.accent,
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    chartInstanceRef.current = chart;
    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || !param.seriesData) {
        setHoveredCandle(null);
        return;
      }
      const data = param.seriesData.get(candleSeries) as {
        open: number;
        high: number;
        low: number;
        close: number;
      } | undefined;

      const volData = param.seriesData.get(volumeSeries) as {
        value: number;
      } | undefined;

      if (data) {
        setHoveredCandle({
          time: String(param.time),
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          volume: volData?.value || 0,
        });
      }
    });

    const handleResize = () => {
      if (chartContainerRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartInstanceRef.current = null;
    };
  }, [theme]);

  // Update data when candles or timeframe changes
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || candles.length === 0) return;

    const visibleCandles = filterCandlesByTimeframe(candles, timeframe);
    const candleData = toCandlestickData(visibleCandles);
    const volumeData = toVolumeData(
      visibleCandles,
      theme === 'dark' ? 'rgba(16, 185, 129, 0.4)' : 'rgba(5, 150, 105, 0.4)',
      theme === 'dark' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(220, 38, 38, 0.4)'
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    candleSeriesRef.current.setData(candleData as any);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    volumeSeriesRef.current.setData(volumeData as any);

    if (chartInstanceRef.current) {
      chartInstanceRef.current.timeScale().fitContent();
    }
  }, [candles, timeframe, theme]);

  const latestCandle = candles[candles.length - 1];
  const previousCandle = candles.length > 1 ? candles[candles.length - 2] : undefined;
  const currentPrice = hoveredCandle?.close ?? latestCandle?.close ?? 0;
  const prevClose = previousCandle?.close ?? currentPrice;
  const priceDiff = currentPrice - prevClose;
  const pricePercent = prevClose ? (priceDiff / prevClose) * 100 : 0;
  const isPositive = priceDiff >= 0;

  const displayCandle = hoveredCandle || latestCandle;

  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.tickerInfo}>
          <span className={styles.tickerSymbol}>{ticker}</span>
          <span className={styles.priceTag}>${currentPrice.toFixed(2)}</span>
          <span className={`${styles.priceChange} ${isPositive ? styles.up : styles.down}`}>
            {isPositive ? '+' : ''}{priceDiff.toFixed(2)} ({isPositive ? '+' : ''}{pricePercent.toFixed(2)}%)
          </span>
        </div>

        <div className={styles.timeframeGroup}>
          {(['1M', '3M', '6M', '1Y', '5Y', 'MAX'] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              className={`${styles.timeframeBtn} ${timeframe === tf ? styles.timeframeBtnActive : ''}`}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {displayCandle && (
        <div className={styles.tooltip}>
          <span className={styles.tooltipItem}>Date: <strong>{displayCandle.time}</strong></span>
          <span className={styles.tooltipItem}>O: <strong>${displayCandle.open.toFixed(2)}</strong></span>
          <span className={styles.tooltipItem}>H: <strong>${displayCandle.high.toFixed(2)}</strong></span>
          <span className={styles.tooltipItem}>L: <strong>${displayCandle.low.toFixed(2)}</strong></span>
          <span className={styles.tooltipItem}>C: <strong>${displayCandle.close.toFixed(2)}</strong></span>
          <span className={styles.tooltipItem}>Vol: <strong>{displayCandle.volume.toLocaleString()}</strong></span>
        </div>
      )}

      <div className={styles.chartContainer} ref={chartContainerRef}>
        {loading && (
          <div className={styles.loadingOverlay}>
            <span>Loading market data...</span>
          </div>
        )}
      </div>
    </div>
  );
};
