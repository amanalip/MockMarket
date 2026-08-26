import {
  Candle,
  BacktestConfig,
  BacktestResult,
  BacktestTrade,
  BacktestEquityPoint,
} from '../../model/types';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateVolumeMA,
} from '../indicators';
import { computeBacktestStats, computeMonthlyReturns } from './stats';

export interface BacktestIndicatorsContext {
  sma20: number[];
  sma50: number[];
  sma200: number[];
  ema12: number[];
  ema26: number[];
  rsi14: number[];
  macd: { macd: number; signal: number; histogram: number }[];
  bb: { upper: number; middle: number; lower: number }[];
  volumeMA20: number[];
}

export interface BarRuleContext {
  index: number;
  candle: Candle;
  candles: Candle[];
  indicators: BacktestIndicatorsContext;
  inPosition: boolean;
  entryPrice?: number;
  holdingDays?: number;
}

export type RuleEvaluator = (ctx: BarRuleContext) => boolean;

export function runBacktest(
  candles: Candle[],
  benchmarkCandles: Candle[],
  config: BacktestConfig,
  entryFn: RuleEvaluator,
  exitFn: RuleEvaluator
): BacktestResult {
  const filteredCandles = candles.filter(
    (c) => c.time >= config.startDate && c.time <= config.endDate
  );

  if (filteredCandles.length < 5) {
    throw new Error('Insufficient historical candle data within the requested date range.');
  }

  // Precompute indicators over full series
  const sma20Map = new Map(calculateSMA(candles, 20).map((p) => [p.time, p.value]));
  const sma50Map = new Map(calculateSMA(candles, 50).map((p) => [p.time, p.value]));
  const sma200Map = new Map(calculateSMA(candles, 200).map((p) => [p.time, p.value]));
  const ema12Map = new Map(calculateEMA(candles, 12).map((p) => [p.time, p.value]));
  const ema26Map = new Map(calculateEMA(candles, 26).map((p) => [p.time, p.value]));
  const rsi14Map = new Map(calculateRSI(candles, 14).map((p) => [p.time, p.value]));
  const macdMap = new Map(calculateMACD(candles, 12, 26, 9).map((p) => [p.time, p]));
  const bbMap = new Map(calculateBollingerBands(candles, 20, 2).map((p) => [p.time, p]));
  const volMAMap = new Map(calculateVolumeMA(candles, 20).map((p) => [p.time, p.value]));

  const indicators: BacktestIndicatorsContext = {
    sma20: filteredCandles.map((c) => sma20Map.get(c.time) || c.close),
    sma50: filteredCandles.map((c) => sma50Map.get(c.time) || c.close),
    sma200: filteredCandles.map((c) => sma200Map.get(c.time) || c.close),
    ema12: filteredCandles.map((c) => ema12Map.get(c.time) || c.close),
    ema26: filteredCandles.map((c) => ema26Map.get(c.time) || c.close),
    rsi14: filteredCandles.map((c) => rsi14Map.get(c.time) || 50),
    macd: filteredCandles.map((c) => macdMap.get(c.time) || { macd: 0, signal: 0, histogram: 0 }),
    bb: filteredCandles.map((c) => bbMap.get(c.time) || { upper: c.close, middle: c.close, lower: c.close }),
    volumeMA20: filteredCandles.map((c) => volMAMap.get(c.time) || c.volume),
  };

  // Benchmark alignment
  const benchMap = new Map(benchmarkCandles.map((c) => [c.time, c.close]));
  const initialBenchPrice = benchMap.get(filteredCandles[0].time) || 100;
  const initialAssetPrice = filteredCandles[0].close;

  let cash = config.initialCash;
  let shares = 0;
  let entryDate = '';
  let entryPrice = 0;
  let entryIndex = 0;

  const trades: BacktestTrade[] = [];
  const equityCurve: BacktestEquityPoint[] = [];

  for (let i = 0; i < filteredCandles.length; i++) {
    const candle = filteredCandles[i];
    const benchClose = benchMap.get(candle.time) || initialBenchPrice;

    const ctx: BarRuleContext = {
      index: i,
      candle,
      candles: filteredCandles,
      indicators,
      inPosition: shares > 0,
      entryPrice: shares > 0 ? entryPrice : undefined,
      holdingDays: shares > 0 ? i - entryIndex : undefined,
    };

    if (shares > 0) {
      let shouldExit = false;
      let exitReason = 'Rule Exit';
      let exitPrice = candle.close;

      // Stop loss check
      if (config.stopLossPercent && config.stopLossPercent > 0) {
        const stopPrice = entryPrice * (1 - config.stopLossPercent / 100);
        if (candle.low <= stopPrice) {
          shouldExit = true;
          exitReason = 'Stop Loss';
          exitPrice = stopPrice;
        }
      }

      // Take profit check
      if (!shouldExit && config.takeProfitPercent && config.takeProfitPercent > 0) {
        const targetPrice = entryPrice * (1 + config.takeProfitPercent / 100);
        if (candle.high >= targetPrice) {
          shouldExit = true;
          exitReason = 'Take Profit';
          exitPrice = targetPrice;
        }
      }

      // Custom rule exit
      if (!shouldExit && exitFn(ctx)) {
        shouldExit = true;
        exitReason = 'Signal Exit';
        exitPrice = candle.close;
      }

      if (shouldExit) {
        const proceeds = shares * exitPrice;
        const pnl = proceeds - (shares * entryPrice);
        const pnlPercent = entryPrice > 0 ? ((exitPrice - entryPrice) / entryPrice) * 100 : 0;

        cash += proceeds;
        trades.push({
          id: `btrade_${trades.length + 1}`,
          entryDate,
          entryPrice: Number(entryPrice.toFixed(2)),
          exitDate: candle.time,
          exitPrice: Number(exitPrice.toFixed(2)),
          shares,
          pnl: Number(pnl.toFixed(2)),
          pnlPercent: Number(pnlPercent.toFixed(2)),
          reason: exitReason,
        });

        shares = 0;
        entryPrice = 0;
        entryDate = '';
      }
    } else {
      // Not in position: check entry condition
      if (entryFn(ctx) && cash > 0) {
        const allocatedCash = cash * (config.positionSizePercent / 100);
        const sharesToBuy = Math.floor(allocatedCash / candle.close);
        if (sharesToBuy > 0) {
          const cost = sharesToBuy * candle.close;
          cash -= cost;
          shares = sharesToBuy;
          entryPrice = candle.close;
          entryDate = candle.time;
          entryIndex = i;
        }
      }
    }

    const currentInvested = shares * candle.close;
    const strategyValue = Number((cash + currentInvested).toFixed(2));
    const buyAndHoldValue = Number(((config.initialCash / initialAssetPrice) * candle.close).toFixed(2));
    const benchmarkValue = Number(((config.initialCash / initialBenchPrice) * benchClose).toFixed(2));

    equityCurve.push({
      date: candle.time,
      strategyValue,
      buyAndHoldValue,
      benchmarkValue,
    });
  }

  const stats = computeBacktestStats(
    trades,
    equityCurve,
    config.initialCash,
    config.startDate,
    config.endDate
  );
  const monthlyReturns = computeMonthlyReturns(equityCurve);

  return {
    config,
    stats,
    trades,
    equityCurve,
    monthlyReturns,
  };
}
