export type AssetType = 'stock' | 'etf' | 'crypto';

export interface TickerInfo {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  assetType: AssetType;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
  description?: string;
}

export interface Candle {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type OrderType = 'market' | 'limit' | 'stop_loss' | 'take_profit';
export type OrderSide = 'buy' | 'sell';
export type OrderStatus = 'pending' | 'filled' | 'cancelled';

export interface Order {
  id: string;
  ticker: string;
  side: OrderSide;
  type: OrderType;
  shares: number;
  limitPrice?: number;
  stopPrice?: number;
  createdAt: string;
  status: OrderStatus;
  filledAt?: string;
  filledPrice?: number;
}

export interface Trade {
  id: string;
  ticker: string;
  side: OrderSide;
  type: OrderType;
  shares: number;
  price: number;
  total: number;
  fee: number;
  timestamp: string;
}

export interface Position {
  ticker: string;
  shares: number;
  avgCost: number;
  totalCost: number;
  currentPrice: number;
  currentValue: number;
  unrealizedPnL: number;
  unrealizedPnLPercent: number;
  realizedPnL: number;
}

export interface PortfolioSnapshot {
  date: string;
  cash: number;
  investedValue: number;
  totalValue: number;
  dailyPnL: number;
  totalPnL: number;
}

export type AppMode = 'trade' | 'backtest' | 'etf' | 'scenarios' | 'timeline';

export interface BacktestRule {
  id: string;
  description: string;
  code: string;
}

export interface BacktestConfig {
  ticker: string;
  startDate: string;
  endDate: string;
  initialCash: number;
  positionSizePercent: number;
  entryRule: string;
  exitRule: string;
  stopLossPercent?: number;
  takeProfitPercent?: number;
}

export interface BacktestStats {
  totalReturnPercent: number;
  cagrPercent: number;
  benchmarkReturnPercent: number;
  winRatePercent: number;
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdownPercent: number;
  maxDrawdownDates: { peak: string; trough: string };
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  avgWinPercent: number;
  avgLossPercent: number;
  avgHoldingDays: number;
}

export interface BacktestTrade {
  id: string;
  entryDate: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  shares: number;
  pnl: number;
  pnlPercent: number;
  reason: string;
}

export interface BacktestEquityPoint {
  date: string;
  strategyValue: number;
  buyAndHoldValue: number;
  benchmarkValue: number;
}

export interface BacktestResult {
  config: BacktestConfig;
  stats: BacktestStats;
  trades: BacktestTrade[];
  equityCurve: BacktestEquityPoint[];
  monthlyReturns: { year: number; month: number; returnPercent: number }[];
}

export type RebalanceFrequency = 'monthly' | 'quarterly' | 'annually' | 'never';

export interface CustomETFConfig {
  id: string;
  name: string;
  tickers: { ticker: string; targetWeight: number }[];
  rebalanceFrequency: RebalanceFrequency;
  createdAt: string;
}

export interface MarketEvent {
  id: string;
  date: string;
  title: string;
  category: 'fed' | 'earnings' | 'crashes' | 'geopolitical' | 'crypto' | 'regulatory';
  description: string;
  sp500DayChangePercent?: number;
  sp500WeekChangePercent?: number;
}

export interface ScenarioStep {
  stepIndex: number;
  title: string;
  instruction: string;
  actionType: 'read' | 'trade' | 'scrub' | 'backtest' | 'inspect';
  targetTicker?: string;
  targetDate?: string;
}

export interface Scenario {
  id: number;
  slug: string;
  title: string;
  category: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  summary: string;
  teaches: string;
  initialCash: number;
  initialDate: string;
  focusTickers: string[];
  markdownContent: string;
  steps: ScenarioStep[];
}
