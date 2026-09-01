import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  createChart,
  CandlestickSeries,
  HistogramSeries,
  LineSeries,
  LineStyle,
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
import {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateVolumeMA,
} from '../../engine/indicators';
import { IndicatorControls, ActiveIndicators } from './IndicatorControls';
import styles from './CandlestickChart.module.css';

interface CandlestickChartProps {
  candles: Candle[];
  ticker: string;
  theme: ThemeMode;
  simulationDate?: string;
  loading?: boolean;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  candles,
  ticker,
  theme,
  simulationDate,
  loading = false,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const sma20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const sma50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const sma200SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema12SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema26SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpperSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbMiddleSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const volumeMASeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const [timeframe, setTimeframe] = useState<Timeframe>('1Y');
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [activeIndicators, setActiveIndicators] = useState<ActiveIndicators>({
    sma20: true,
    sma50: false,
    sma200: false,
    ema12: false,
    ema26: false,
    bollinger: false,
    volumeMA: true,
  });

  // Filter candles strictly up to simulation date (prevent looking into future data)
  const simulationCandles = useMemo(() => {
    if (!simulationDate) return candles;
    return candles.filter((c) => c.time <= simulationDate);
  }, [candles, simulationDate]);

  // Precompute indicator values
  const indicatorData = useMemo(() => {
    if (simulationCandles.length === 0) return null;
    return {
      sma20: calculateSMA(simulationCandles, 20),
      sma50: calculateSMA(simulationCandles, 50),
      sma200: calculateSMA(simulationCandles, 200),
      ema12: calculateEMA(simulationCandles, 12),
      ema26: calculateEMA(simulationCandles, 26),
      bollinger: calculateBollingerBands(simulationCandles, 20, 2),
      volumeMA: calculateVolumeMA(simulationCandles, 20),
    };
  }, [simulationCandles]);

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
        fontFamily: "ui-monospace, 'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
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
          style: LineStyle.Dotted,
          labelBackgroundColor: colors.bgCard,
        },
        horzLine: {
          color: colors.chartCrosshair,
          width: 1,
          style: LineStyle.Dotted,
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

    sma20SeriesRef.current = chart.addSeries(LineSeries, { color: '#38bdf8', lineWidth: 2, title: 'SMA 20' });
    sma50SeriesRef.current = chart.addSeries(LineSeries, { color: '#fb923c', lineWidth: 2, title: 'SMA 50' });
    sma200SeriesRef.current = chart.addSeries(LineSeries, { color: '#a855f7', lineWidth: 2, title: 'SMA 200' });
    ema12SeriesRef.current = chart.addSeries(LineSeries, { color: '#facc15', lineWidth: 2, title: 'EMA 12' });
    ema26SeriesRef.current = chart.addSeries(LineSeries, { color: '#ec4899', lineWidth: 2, title: 'EMA 26' });

    bbUpperSeriesRef.current = chart.addSeries(LineSeries, { color: 'rgba(45, 212, 191, 0.7)', lineWidth: 1, lineStyle: LineStyle.Dashed });
    bbMiddleSeriesRef.current = chart.addSeries(LineSeries, { color: '#2dd4bf', lineWidth: 1 });
    bbLowerSeriesRef.current = chart.addSeries(LineSeries, { color: 'rgba(45, 212, 191, 0.7)', lineWidth: 1, lineStyle: LineStyle.Dashed });

    volumeMASeriesRef.current = chart.addSeries(LineSeries, { color: '#94a3b8', lineWidth: 1, priceScaleId: '' });
    volumeMASeriesRef.current.priceScale().applyOptions({
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
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      sma20SeriesRef.current = null;
      sma50SeriesRef.current = null;
      sma200SeriesRef.current = null;
      ema12SeriesRef.current = null;
      ema26SeriesRef.current = null;
      bbUpperSeriesRef.current = null;
      bbMiddleSeriesRef.current = null;
      bbLowerSeriesRef.current = null;
      volumeMASeriesRef.current = null;
    };
  }, [theme]);

  // Update data & indicator series when candles, timeframe, or active indicators change
  useEffect(() => {
    if (!candleSeriesRef.current || !volumeSeriesRef.current || simulationCandles.length === 0) return;

    const visibleCandles = filterCandlesByTimeframe(simulationCandles, timeframe, simulationDate);
    if (visibleCandles.length === 0) return;
    const minTime = visibleCandles[0].time;
    const maxTime = visibleCandles[visibleCandles.length - 1].time;

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

    const filterRange = <T extends { time: string }>(items: T[]): T[] => {
      return items.filter((item) => item.time >= minTime && item.time <= maxTime);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setSeriesData = (seriesRef: React.RefObject<ISeriesApi<'Line'> | null>, isEnabled: boolean, data: any[]) => {
      if (seriesRef.current) {
        seriesRef.current.setData(isEnabled ? data : []);
      }
    };

    if (indicatorData) {
      setSeriesData(sma20SeriesRef, activeIndicators.sma20, filterRange(indicatorData.sma20));
      setSeriesData(sma50SeriesRef, activeIndicators.sma50, filterRange(indicatorData.sma50));
      setSeriesData(sma200SeriesRef, activeIndicators.sma200, filterRange(indicatorData.sma200));
      setSeriesData(ema12SeriesRef, activeIndicators.ema12, filterRange(indicatorData.ema12));
      setSeriesData(ema26SeriesRef, activeIndicators.ema26, filterRange(indicatorData.ema26));

      const bbVisible = filterRange(indicatorData.bollinger);
      setSeriesData(bbUpperSeriesRef, activeIndicators.bollinger, bbVisible.map((p) => ({ time: p.time, value: p.upper })));
      setSeriesData(bbMiddleSeriesRef, activeIndicators.bollinger, bbVisible.map((p) => ({ time: p.time, value: p.middle })));
      setSeriesData(bbLowerSeriesRef, activeIndicators.bollinger, bbVisible.map((p) => ({ time: p.time, value: p.lower })));

      setSeriesData(volumeMASeriesRef, activeIndicators.volumeMA, filterRange(indicatorData.volumeMA));
    }

    if (chartInstanceRef.current) {
      chartInstanceRef.current.timeScale().fitContent();
    }
  }, [simulationCandles, timeframe, theme, indicatorData, activeIndicators, simulationDate]);

  const latestCandle = simulationCandles[simulationCandles.length - 1];
  const previousCandle = simulationCandles.length > 1 ? simulationCandles[simulationCandles.length - 2] : undefined;
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

      <IndicatorControls
        indicators={activeIndicators}
        onChange={setActiveIndicators}
      />

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
            <span>Loading simulation data...</span>
          </div>
        )}
      </div>
    </div>
  );
};
