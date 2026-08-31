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
  if (!Number.isFinite(config.initialCash) || config.initialCash <= 0) {
    throw new Error('Invalid initialCash');
  }
  const isValidDate = (s: string) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime()) && new Date(s).toISOString().slice(0,10) === s;
  if (!isValidDate(config.startDate) || !isValidDate(config.endDate)) {
    throw new Error('Invalid date range');
  }
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
    sma20: filteredCandles.map((c) => {
      const v = sma20Map.get(c.time);
      return Number.isFinite(v) ? v! : c.close;
    }),
    sma50: filteredCandles.map((c) => {
      const v = sma50Map.get(c.time);
      return Number.isFinite(v) ? v! : c.close;
    }),
    sma200: filteredCandles.map((c) => {
      const v = sma200Map.get(c.time);
      return Number.isFinite(v) ? v! : c.close;
    }),
    ema12: filteredCandles.map((c) => {
      const v = ema12Map.get(c.time);
      return Number.isFinite(v) ? v! : c.close;
    }),
    ema26: filteredCandles.map((c) => {
      const v = ema26Map.get(c.time);
      return Number.isFinite(v) ? v! : c.close;
    }),
    rsi14: filteredCandles.map((c) => {
      const v = rsi14Map.get(c.time);
      return Number.isFinite(v) ? v! : 50;
    }),
    macd: filteredCandles.map((c) => macdMap.get(c.time) ?? { macd: 0, signal: 0, histogram: 0 }),
    bb: filteredCandles.map((c) => bbMap.get(c.time) ?? { upper: c.close, middle: c.close, lower: c.close }),
    volumeMA20: filteredCandles.map((c) => {
      const v = volMAMap.get(c.time);
      return Number.isFinite(v) ? v! : c.volume;
    }),
  };

  const validBenchmarkCandles = benchmarkCandles
    .filter((c) => Number.isFinite(c.close) && c.close > 0)
    .sort((a, b) => a.time.localeCompare(b.time));
  const firstBenchClose = validBenchmarkCandles[0]?.close;
  const fallbackBenchPrice = Number.isFinite(firstBenchClose) && (firstBenchClose as number) > 0 ? (firstBenchClose as number) : (Number.isFinite(filteredCandles[0].close) && filteredCandles[0].close > 0 ? filteredCandles[0].close : 100);
  let benchmarkIndex = -1;
  while (benchmarkIndex + 1 < validBenchmarkCandles.length && validBenchmarkCandles[benchmarkIndex + 1].time <= filteredCandles[0].time) {
    benchmarkIndex++;
  }
  const initialBenchPrice = benchmarkIndex >= 0 ? validBenchmarkCandles[benchmarkIndex].close : fallbackBenchPrice;
  let latestBenchPrice = initialBenchPrice;
  const initialAssetPrice = Number.isFinite(filteredCandles[0].close) && filteredCandles[0].close > 0 ? filteredCandles[0].close : 1;

  let cash = config.initialCash;
  let shares = 0;
  let entryDate = '';
  let entryPrice = 0;
  let entryIndex = 0;
  let pendingEntry = false;
  let pendingExit = false;

  const trades: BacktestTrade[] = [];
  const equityCurve: BacktestEquityPoint[] = [];

  // Validate config
  const positionSize = Math.max(0, Math.min(100, config.positionSizePercent));
  const stopLoss = config.stopLossPercent && Number.isFinite(config.stopLossPercent) && config.stopLossPercent > 0 ? Math.min(99, config.stopLossPercent) : 0;
  const takeProfit = config.takeProfitPercent && Number.isFinite(config.takeProfitPercent) && config.takeProfitPercent > 0 ? config.takeProfitPercent : 0;

  for (let i = 0; i < filteredCandles.length; i++) {
    const candle = filteredCandles[i];
    while (benchmarkIndex + 1 < validBenchmarkCandles.length && validBenchmarkCandles[benchmarkIndex + 1].time <= candle.time) {
      benchmarkIndex++;
      latestBenchPrice = validBenchmarkCandles[benchmarkIndex].close;
    }
    const validOpen = Number.isFinite(candle.open) && candle.open > 0;

    // Rules use completed-bar data, so queued signals execute at the next valid open.
    if (shares > 0 && pendingExit && validOpen) {
      const exitPrice = candle.open;
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
        reason: 'Signal Exit',
      });
      shares = 0;
      entryPrice = 0;
      entryDate = '';
      pendingExit = false;
    } else if (shares === 0 && pendingEntry && validOpen) {
      const allocatedCash = cash * (positionSize / 100);
      const sharesToBuy = Math.floor(allocatedCash / candle.open);
      if (Number.isFinite(sharesToBuy) && sharesToBuy > 0) {
        const cost = sharesToBuy * candle.open;
        if (Number.isFinite(cost) && cost <= cash) {
          cash -= cost;
          shares = sharesToBuy;
          entryPrice = candle.open;
          entryDate = candle.time;
          entryIndex = i;
        }
      }
      pendingEntry = false;
    }

    if (shares > 0) {
      let shouldExit = false;
      let exitReason = 'Rule Exit';
      let exitPrice = candle.close;

      // Stop loss check
      if (stopLoss > 0) {
        const stopPrice = entryPrice * (1 - stopLoss / 100);
        if (candle.low <= stopPrice) {
          shouldExit = true;
          exitReason = 'Stop Loss';
          exitPrice = validOpen && candle.open <= stopPrice ? candle.open : stopPrice;
        }
      }

      // Take profit check
      if (!shouldExit && takeProfit > 0) {
        const targetPrice = entryPrice * (1 + takeProfit / 100);
        if (candle.high >= targetPrice) {
          shouldExit = true;
          exitReason = 'Take Profit';
          exitPrice = validOpen && candle.open >= targetPrice ? candle.open : targetPrice;
        }
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
        pendingExit = false;
      }
    }

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
      if (exitFn(ctx)) pendingExit = true;
    } else if (entryFn(ctx) && cash > 0) {
      pendingEntry = true;
    }

    // Handle corrupt candle close (NaN/Infinity/0) gracefully – use last valid price or entryPrice
    let safeClose = candle.close;
    if (!Number.isFinite(safeClose) || safeClose <= 0) {
      // find previous finite close
      for (let k = i - 1; k >= 0; k--) {
        const prevClose = filteredCandles[k].close;
        if (Number.isFinite(prevClose) && prevClose > 0) { safeClose = prevClose; break; }
      }
      if (!Number.isFinite(safeClose) || safeClose <= 0) safeClose = entryPrice > 0 ? entryPrice : initialAssetPrice;
    }
    const currentInvested = shares * safeClose;
    const strategyValue = Number((cash + currentInvested).toFixed(2));
    const buyAndHoldValue = Number(((config.initialCash / initialAssetPrice) * safeClose).toFixed(2));
    const benchmarkValue = Number(((config.initialCash / initialBenchPrice) * latestBenchPrice).toFixed(2));

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
