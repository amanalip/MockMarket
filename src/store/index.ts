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
  Scenario 
} from '../model/types';
import { ThemeMode } from '../theme';

interface UIState {
  mode: AppMode;
  theme: ThemeMode;
  sidebarOpen: boolean;
  simulationDate: string;
  isPlaying: boolean;
  playbackSpeed: number; // in milliseconds per step
  selectedTicker: string;
  setMode: (mode: AppMode) => void;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  setSidebarOpen: (open: boolean) => void;
  setSimulationDate: (date: string) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  setSelectedTicker: (ticker: string) => void;
}

interface PortfolioState {
  startingCash: number;
  cash: number;
  positions: Record<string, Position>;
  history: PortfolioSnapshot[];
  trades: Trade[];
  orders: Order[];
  commission: number;
  setStartingCash: (amount: number) => void;
  resetPortfolio: (startingCash?: number) => void;
  setCash: (amount: number) => void;
  addTrade: (trade: Trade) => void;
  addOrder: (order: Order) => void;
  cancelOrder: (orderId: string) => void;
  updatePositions: (positions: Record<string, Position>) => void;
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
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('mockmarket_theme') as ThemeMode;
    if (saved === 'light' || saved === 'dark') return saved;
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
  setMode: (mode) => set({ mode }),
  toggleTheme: () => set((state) => {
    const next = state.theme === 'dark' ? 'light' : 'dark';
    if (typeof window !== 'undefined') {
      localStorage.setItem('mockmarket_theme', next);
      document.documentElement.setAttribute('data-theme', next);
    }
    return { theme: next };
  }),
  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mockmarket_theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
    }
    set({ theme });
  },
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setSimulationDate: (simulationDate) => set({ simulationDate }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setPlaybackSpeed: (playbackSpeed) => set({ playbackSpeed }),
  setSelectedTicker: (selectedTicker) => set({ selectedTicker }),
}));

export const usePortfolioStore = create<PortfolioState>((set) => ({
  startingCash: 100000,
  cash: 100000,
  positions: {},
  history: [],
  trades: [],
  orders: [],
  commission: 0,
  setStartingCash: (startingCash) => set({ startingCash, cash: startingCash, positions: {}, history: [], trades: [], orders: [] }),
  resetPortfolio: (startingCash = 100000) => set({ startingCash, cash: startingCash, positions: {}, history: [], trades: [], orders: [] }),
  setCash: (cash) => set({ cash }),
  addTrade: (trade) => set((state) => ({ trades: [trade, ...state.trades] })),
  addOrder: (order) => set((state) => ({ orders: [order, ...state.orders] })),
  cancelOrder: (orderId) => set((state) => ({
    orders: state.orders.map((o) => o.id === orderId ? { ...o, status: 'cancelled' as const } : o),
  })),
  updatePositions: (positions) => set({ positions }),
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
  setConfig: (partial) => set((state) => ({ config: { ...state.config, ...partial } })),
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
