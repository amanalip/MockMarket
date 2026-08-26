import { StrategyTemplate } from './strategy-types';

export const SAMPLE_STRATEGIES: StrategyTemplate[] = [
  {
    id: 'golden_cross',
    name: 'Golden Cross (SMA 50/200)',
    description: 'Enters when 50-day moving average crosses above 200-day moving average. Exits on death cross.',
    entryRule: 'crosses_above(SMA(50), SMA(200))',
    exitRule: 'crosses_below(SMA(50), SMA(200))',
    defaultStopLoss: 8,
    defaultTakeProfit: 25,
  },
  {
    id: 'rsi_mean_reversion',
    name: 'RSI Mean Reversion',
    description: 'Enters when asset is oversold (RSI < 30) and exits when overbought (RSI > 70).',
    entryRule: 'RSI() < 30',
    exitRule: 'RSI() > 70',
    defaultStopLoss: 6,
    defaultTakeProfit: 15,
  },
  {
    id: 'bollinger_bounce',
    name: 'Bollinger Band Bounce',
    description: 'Buys when price touches or dips below the lower band, selling at the upper band.',
    entryRule: 'PRICE < BB_LOWER()',
    exitRule: 'PRICE > BB_UPPER()',
    defaultStopLoss: 5,
    defaultTakeProfit: 12,
  },
  {
    id: 'macd_crossover',
    name: 'MACD Signal Crossover',
    description: 'Buys when MACD line crosses above Signal line and exits on negative crossover.',
    entryRule: 'crosses_above(MACD(), MACD_SIGNAL())',
    exitRule: 'crosses_below(MACD(), MACD_SIGNAL())',
    defaultStopLoss: 7,
    defaultTakeProfit: 20,
  },
];
