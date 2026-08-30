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
  setSimulationDate: (date: string) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setSelectedTicker: (ticker: string) => void;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
}

const tradingEngineInstance = new TradingEngine(100000, 0);

interface PortfolioState {
  startingCash: number;
  cash: number;
  positions: Record<string, Position>;
  history: PortfolioSnapshot[];
  trades: Trade[];
  orders: Order[];
  commission: number;
  setStartingCash: (amount: number) => void;
  setCash: (amount: number) => void;
  resetPortfolio: (startingCash?: number) => void;
  executeTrade: (req: OrderRequest, candle?: Candle) => ExecutionResult;
  processCandleForOrders: (candle: Candle, ticker: string) => Order[];
  updateMarketPrices: (priceMap: Record<string, number>) => void;
  cancelOrder: (orderId: string) => void;
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
  setMode: (mode) => set({ mode }),
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
  setSimulationDate: (simulationDate) => set({ simulationDate }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPlaybackSpeed: (playbackSpeed) => {
    const v = Number(playbackSpeed);
    if (!Number.isFinite(v)) return;
    const clamped = Math.max(50, Math.min(5000, v));
    set({ playbackSpeed: clamped });
  },
  setSelectedTicker: (selectedTicker) => set({ selectedTicker }),
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

export const usePortfolioStore = create<PortfolioState>((set) => ({
  startingCash: 100000,
  cash: 100000,
  positions: {},
  history: [],
  trades: [],
  orders: [],
  commission: 0,
  setStartingCash: (startingCash) => {
    if (!Number.isFinite(startingCash) || startingCash < 0) return;
    tradingEngineInstance.setStartingCash(startingCash);
    const engineState = tradingEngineInstance.getState();
    set({
      startingCash,
      cash: engineState.cash,
      positions: engineState.positions,
      history: [],
      trades: [],
      orders: [],
    });
  },
  setCash: (cash) => {
    if (!Number.isFinite(cash) || cash < 0) return;
    // Sync engine cash to avoid divergence with store
    (tradingEngineInstance as unknown as { state: { cash: number } }).state.cash = cash;
    set({ cash });
  },
  resetPortfolio: (startingCash = 100000) => {
    tradingEngineInstance.setStartingCash(startingCash);
    const engineState = tradingEngineInstance.getState();
    set({
      startingCash,
      cash: engineState.cash,
      positions: engineState.positions,
      history: [],
      trades: [],
      orders: [],
    });
  },
  executeTrade: (req, candle) => {
    const res = tradingEngineInstance.placeOrder(req, candle);
    const engineState = tradingEngineInstance.getState();
    set({
      cash: engineState.cash,
      positions: engineState.positions,
      trades: engineState.trades,
      orders: engineState.orders,
    });
    return res;
  },
  processCandleForOrders: (candle, ticker) => {
    const filled = tradingEngineInstance.processPendingOrders(candle, ticker);
    if (filled.length > 0) {
      const engineState = tradingEngineInstance.getState();
      set({
        cash: engineState.cash,
        positions: engineState.positions,
        trades: engineState.trades,
        orders: engineState.orders,
      });
    }
    return filled;
  },
  updateMarketPrices: (priceMap) => {
    tradingEngineInstance.updatePrices(priceMap);
    const engineState = tradingEngineInstance.getState();
    set({ positions: engineState.positions });
  },
  cancelOrder: (orderId) => {
    tradingEngineInstance.cancelOrder(orderId);
    const engineState = tradingEngineInstance.getState();
    set({ orders: engineState.orders });
  },
}));

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
  saveETF: (etf) => set((state) => ({
    savedETFs: [...state.savedETFs.filter((e) => e.id !== etf.id), etf],
    activeETF: etf,
  })),
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
  setCurrentStepIndex: (currentStepIndex) => set({ currentStepIndex }),
  markCompleted: (id) => set((state) => ({
    completedScenarioIds: state.completedScenarioIds.includes(id)
      ? state.completedScenarioIds
      : [...state.completedScenarioIds, id],
  })),
}));
