import { create } from 'zustand';
import { 
  AppMode, 
  Position, 
  Trade, 
  Order, 
  PortfolioSnapshot, 
  BacktestConfig, 
  BacktestResult, 
  CustomETFConfig, 
  Scenario,
  Candle
} from '../model/types';
import { ThemeMode } from '../theme';
import { TradingEngine } from '../engine/trading/trading-engine';
import { OrderRequest, ExecutionResult } from '../engine/trading/order-types';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface UIState {
  mode: AppMode;
  theme: ThemeMode;
  sidebarOpen: boolean;
  simulationDate: string;
  isPlaying: boolean;
  playbackSpeed: number;
  selectedTicker: string;
  toasts: ToastMessage[];
  setMode: (mode: AppMode) => void;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  setSidebarOpen: (open: boolean) => void;
  setSimulationDate: (date: string) => boolean;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setSelectedTicker: (ticker: string) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const tradingEngineInstance = new TradingEngine(100000, 0);
let preparePortfolioRewind = (_targetDate: string): boolean => true;
let recordPortfolioSnapshot = (_date: string): void => {};

export function upsertPortfolioSnapshot(
  history: PortfolioSnapshot[],
  snapshot: PortfolioSnapshot
): PortfolioSnapshot[] {
  return normalizePortfolioHistory([...history, snapshot]);
}

function normalizePortfolioHistory(history: PortfolioSnapshot[]): PortfolioSnapshot[] {
  const byDate = new Map(history.map((entry) => [entry.date, entry]));

  return [...byDate.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((entry, index, sorted) => ({
      ...entry,
      dailyPnL: index === 0
        ? 0
        : Number((entry.totalValue - sorted[index - 1].totalValue).toFixed(2)),
    }));
}

interface PortfolioState {
  startingCash: number;
  cash: number;
  reservedCash: number;
  availableCash: number;
  positions: Record<string, Position>;
  history: PortfolioSnapshot[];
  trades: Trade[];
  orders: Order[];
  commission: number;
  realizedPnL: number;
  setStartingCash: (amount: number) => void;
  setCash: (amount: number) => void;
  resetPortfolio: (startingCash?: number) => void;
  executeTrade: (req: OrderRequest, candle?: Candle) => ExecutionResult;
  processCandleForOrders: (candle: Candle, ticker: string) => Order[];
  updateMarketPrices: (priceMap: Record<string, number>) => void;
  cancelOrder: (orderId: string) => void;
  recordSnapshot: (date?: string) => void;
  hasAccountActivity: () => boolean;
  prepareRewind: (targetDate: string) => boolean;
}

interface BacktesterState {
  config: BacktestConfig;
  result: BacktestResult | null;
  isRunning: boolean;
  error: string | null;
  setConfig: (config: Partial<BacktestConfig>) => void;
  setResult: (result: BacktestResult | null) => void;
  setIsRunning: (isRunning: boolean) => void;
  setError: (error: string | null) => void;
}

interface ETFState {
  savedETFs: CustomETFConfig[];
  activeETF: CustomETFConfig | null;
  saveETF: (etf: CustomETFConfig) => void;
  deleteETF: (id: string) => void;
  setActiveETF: (etf: CustomETFConfig | null) => void;
}

interface ScenarioState {
  activeScenario: Scenario | null;
  currentStepIndex: number;
  completedScenarioIds: number[];
  setActiveScenario: (scenario: Scenario | null) => void;
  setCurrentStepIndex: (index: number) => void;
  markCompleted: (id: number) => void;
}

const getInitialTheme = (): ThemeMode => {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mockmarket_theme') as ThemeMode;
      if (saved === 'light' || saved === 'dark') return saved;
    }
  } catch {
    // ignore quota or SSR errors
  }
  return 'dark';
};

export const useUIStore = create<UIState>((set) => ({
  mode: 'trade',
  theme: getInitialTheme(),
  sidebarOpen: true,
  simulationDate: '2024-01-02',
  isPlaying: false,
  playbackSpeed: 500,
  selectedTicker: 'AAPL',
  toasts: [],
  setMode: (mode) => {
    const valid: AppMode[] = ['trade', 'backtest', 'etf', 'scenarios', 'timeline'];
    if (!valid.includes(mode)) return;
    set({ mode });
  },
  toggleTheme: () => set((state) => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('mockmarket_theme', next);
        document.documentElement.setAttribute('data-theme', next);
      }
    } catch {}
    return { theme: next };
  }),
  setTheme: (theme) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('mockmarket_theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
      }
    } catch {}
    set({ theme });
  },
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setSimulationDate: (simulationDate) => {
    if (typeof simulationDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(simulationDate)) return false;
    const d = new Date(simulationDate);
    if (Number.isNaN(d.getTime()) || d.toISOString().slice(0,10) !== simulationDate) return false;
    let accepted = true;
    set((state) => {
      if (simulationDate < state.simulationDate && !preparePortfolioRewind(simulationDate)) {
        accepted = false;
        return state;
      }
      return { simulationDate };
    });
    if (accepted) recordPortfolioSnapshot(simulationDate);
    return accepted;
  },
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPlaybackSpeed: (playbackSpeed) => {
    const v = Number(playbackSpeed);
    if (!Number.isFinite(v)) return;
    const clamped = Math.max(50, Math.min(5000, v));
    set({ playbackSpeed: clamped });
  },
  setSelectedTicker: (selectedTicker) => {
    if (typeof selectedTicker !== 'string' || !selectedTicker.trim()) return;
    const clean = selectedTicker.trim().toUpperCase();
    set({ selectedTicker: clean });
  },
  addToast: (message, type = 'info') => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 6)}_${Math.random().toString(36).substring(2, 3)}`;
    set((state) => ({ toasts: [...state.toasts.slice(-9), { id, message, type }] }));
    const timer = setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
    if (typeof timer === 'object' && 'unref' in timer)
      (timer as unknown as NodeJS.Timeout).unref?.();
  },
  removeToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export const usePortfolioStore = create<PortfolioState>((set, get) => ({
  startingCash: 100000,
  cash: 100000,
  reservedCash: 0,
  availableCash: 100000,
  positions: {},
  history: [],
  trades: [],
  orders: [],
  commission: 0,
  realizedPnL: 0,
  setStartingCash: (startingCash) => {
    if (!Number.isFinite(startingCash) || startingCash < 0) return;
    tradingEngineInstance.setStartingCash(startingCash);
    const engineState = tradingEngineInstance.getState();
    set({
      startingCash,
      cash: engineState.cash,
      reservedCash: engineState.reservedCash,
      availableCash: engineState.availableCash,
      positions: engineState.positions,
      history: [],
      trades: [],
      orders: [],
      realizedPnL: engineState.realizedPnL,
    });
  },
  setCash: (cash) => {
    if (!Number.isFinite(cash) || cash < 0) return;
    tradingEngineInstance.setCash(cash);
    const engineState = tradingEngineInstance.getState();
    // Direct cash changes are external cash flows, so they begin a new history period.
    set({
      cash: engineState.cash,
      reservedCash: engineState.reservedCash,
      availableCash: engineState.availableCash,
      history: [],
    });
  },
  resetPortfolio: (startingCash = 100000) => {
    tradingEngineInstance.setStartingCash(startingCash);
    const engineState = tradingEngineInstance.getState();
    set({
      startingCash,
      cash: engineState.cash,
      reservedCash: engineState.reservedCash,
      availableCash: engineState.availableCash,
      positions: engineState.positions,
      history: [],
      trades: [],
      orders: [],
      realizedPnL: engineState.realizedPnL,
    });
  },
  executeTrade: (req, candle) => {
    const res = tradingEngineInstance.placeOrder(req, candle);
    const engineState = tradingEngineInstance.getState();
    set({
      cash: engineState.cash,
      reservedCash: engineState.reservedCash,
      availableCash: engineState.availableCash,
      positions: engineState.positions,
      trades: engineState.trades,
      orders: engineState.orders,
      realizedPnL: engineState.realizedPnL,
    });
    if (res.filled) get().recordSnapshot(req.date || candle?.time);
    return res;
  },
  processCandleForOrders: (candle, ticker) => {
    const filled = tradingEngineInstance.processPendingOrders(candle, ticker);
    const engineState = tradingEngineInstance.getState();
    set({
      cash: engineState.cash,
      reservedCash: engineState.reservedCash,
      availableCash: engineState.availableCash,
      positions: engineState.positions,
      trades: engineState.trades,
      orders: engineState.orders,
      realizedPnL: engineState.realizedPnL,
    });
    if (filled.length > 0) {
      get().recordSnapshot(candle.time);
    }
    return filled;
  },
  updateMarketPrices: (priceMap) => {
    priceMap = Object.fromEntries(
      Object.entries(priceMap).map(([ticker, price]) => [ticker.trim().toUpperCase(), price])
    );
    const before = tradingEngineInstance.getState();
    tradingEngineInstance.updatePrices(priceMap);
    const engineState = tradingEngineInstance.getState();
    set({ positions: engineState.positions });
    const repriced = Object.keys(before.positions).some((ticker) => (
      Number.isFinite(priceMap[ticker]) && priceMap[ticker] >= 0
    ));
    if (repriced) get().recordSnapshot();
  },
  cancelOrder: (orderId) => {
    const cancelled = tradingEngineInstance.cancelOrder(orderId);
    const engineState = tradingEngineInstance.getState();
    set({
      cash: engineState.cash,
      reservedCash: engineState.reservedCash,
      availableCash: engineState.availableCash,
      orders: engineState.orders,
    });
    if (cancelled) get().recordSnapshot();
  },
  recordSnapshot: (date = useUIStore.getState().simulationDate) => {
    if (
      typeof date !== 'string'
      || !/^\d{4}-\d{2}-\d{2}$/.test(date)
      || Number.isNaN(new Date(date).getTime())
      || new Date(date).toISOString().slice(0, 10) !== date
    ) return;
    const state = get();
    const investedValue = Object.values(state.positions).reduce(
      (sum, position) => sum + position.currentValue,
      0
    );
    const totalValue = Number((state.cash + investedValue).toFixed(2));
    const snapshot: PortfolioSnapshot = {
      date,
      cash: state.cash,
      investedValue: Number(investedValue.toFixed(2)),
      totalValue,
      dailyPnL: 0,
      totalPnL: Number((totalValue - state.startingCash).toFixed(2)),
    };
    set((current) => ({ history: upsertPortfolioSnapshot(current.history, snapshot) }));
  },
  hasAccountActivity: () => {
    const state = get();
    return state.trades.length > 0 || state.orders.length > 0 || Object.keys(state.positions).length > 0;
  },
  prepareRewind: (targetDate) => {
    if (get().hasAccountActivity()) return false;
    set((state) => ({
      history: normalizePortfolioHistory(
        state.history.filter((snapshot) => snapshot.date <= targetDate)
      ),
    }));
    return true;
  },
}));

preparePortfolioRewind = (targetDate) => usePortfolioStore.getState().prepareRewind(targetDate);
recordPortfolioSnapshot = (date) => usePortfolioStore.getState().recordSnapshot(date);

export const useBacktesterStore = create<BacktesterState>((set) => ({
  config: {
    ticker: 'AAPL',
    startDate: '2020-01-01',
    endDate: '2024-01-01',
    initialCash: 100000,
    positionSizePercent: 100,
    entryRule: 'crosses_above(SMA(50), SMA(200))',
    exitRule: 'crosses_below(SMA(50), SMA(200))',
    stopLossPercent: 10,
    takeProfitPercent: 25,
  },
  result: null,
  isRunning: false,
  error: null,
  setConfig: (partial) => {
    const sanitized: Partial<BacktestConfig> = { ...partial };
    if (sanitized.positionSizePercent !== undefined) {
      const v = Number(sanitized.positionSizePercent);
      if (!Number.isFinite(v)) delete sanitized.positionSizePercent;
      else sanitized.positionSizePercent = Math.max(1, Math.min(100, v));
    }
    if (sanitized.initialCash !== undefined) {
      const v = Number(sanitized.initialCash);
      if (!Number.isFinite(v) || v < 1000) delete sanitized.initialCash;
    }
    const isValidISO = (s: string) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(s).getTime()) && new Date(s).toISOString().slice(0,10) === s;
    if (sanitized.startDate !== undefined && !isValidISO(sanitized.startDate)) delete sanitized.startDate;
    if (sanitized.endDate !== undefined && !isValidISO(sanitized.endDate)) delete sanitized.endDate;
    if (sanitized.startDate && sanitized.endDate && sanitized.startDate > sanitized.endDate) {
      // swap to maintain valid range
      const tmp = sanitized.startDate;
      sanitized.startDate = sanitized.endDate;
      sanitized.endDate = tmp;
    }
    set((state) => ({ config: { ...state.config, ...sanitized } }));
  },
  setResult: (result) => set({ result }),
  setIsRunning: (isRunning) => set({ isRunning }),
  setError: (error) => set({ error }),
}));

export const useETFStore = create<ETFState>((set) => ({
  savedETFs: [],
  activeETF: null,
  saveETF: (etf) => {
    if (!etf || typeof etf !== 'object' || typeof etf.id !== 'string') return;
    const copy = JSON.parse(JSON.stringify(etf));
    // ensure id collision not silent overwrite in same ms is still intentional, but copy prevents external mutation
    set((state) => ({
      savedETFs: [...state.savedETFs.filter((e) => e.id !== copy.id), copy],
      activeETF: copy,
    }));
  },
  deleteETF: (id) => set((state) => ({
    savedETFs: state.savedETFs.filter((e) => e.id !== id),
    activeETF: state.activeETF?.id === id ? null : state.activeETF,
  })),
  setActiveETF: (activeETF) => set({ activeETF }),
}));

export const useScenarioStore = create<ScenarioState>((set) => ({
  activeScenario: null,
  currentStepIndex: 0,
  completedScenarioIds: [],
  setActiveScenario: (activeScenario) => set({ activeScenario, currentStepIndex: 0 }),
  setCurrentStepIndex: (currentStepIndex) => {
    const v = Number(currentStepIndex);
    if (!Number.isFinite(v) || !Number.isInteger(v) || v < 0) return;
    // clamp to 0..1000 to avoid overflow, real max checked in UI
    const clamped = Math.min(1000, v);
    set({ currentStepIndex: clamped });
  },
  markCompleted: (id) => set((state) => ({
    completedScenarioIds: state.completedScenarioIds.includes(id)
      ? state.completedScenarioIds
      : [...state.completedScenarioIds, id],
  })),
}));
