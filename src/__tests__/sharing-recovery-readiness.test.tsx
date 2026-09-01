import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppErrorBoundary } from '../components/ui/AppErrorBoundary';
import { ShareModal } from '../components/ui/ShareModal';
import { decodeShareState, encodeShareState, ShareableStatePayload } from '../engine/export/url-state';
import {
  applySharedState,
  restoreSharedStateFromHash,
  useBacktesterStore,
  useETFStore,
  usePortfolioStore,
  useUIStore,
} from '../store';
import { reportClientError } from '../engine/reporting/client-reporting';

const completePayload: ShareableStatePayload = {
  version: 1,
  mode: 'backtest',
  ticker: 'NVDA',
  date: '2023-06-15',
  cash: 50_000,
  backtest: {
    ticker: 'MSFT',
    startDate: '2020-01-02',
    endDate: '2024-01-02',
    initialCash: 25_000,
    positionSizePercent: 40,
    entryRule: 'CLOSE > SMA(20)',
    exitRule: 'CLOSE < SMA(20)',
    stopLossPercent: 5,
    takeProfitPercent: 15,
  },
};

describe('share restoration and validation', () => {
  beforeEach(() => {
    localStorage.clear();
    usePortfolioStore.getState().resetPortfolio(100_000);
    useUIStore.setState({ mode: 'trade', selectedTicker: 'AAPL', simulationDate: '2024-01-02' });
  });

  it('restores a completely validated startup hash across stores', () => {
    expect(restoreSharedStateFromHash(`#share=${encodeShareState(completePayload)}`)).toBe(true);
    expect(useUIStore.getState()).toMatchObject({ mode: 'backtest', selectedTicker: 'NVDA', simulationDate: '2023-06-15' });
    expect(usePortfolioStore.getState().cash).toBe(50_000);
    expect(useBacktesterStore.getState().config).toMatchObject(completePayload.backtest!);
  });

  it.each([
    { ...completePayload, version: 2 },
    { ...completePayload, mode: 'admin' },
    { ...completePayload, ticker: '../../secret' },
    { ...completePayload, date: '2025-01-01' },
    { ...completePayload, cash: 1_000_000_001 },
    { ...completePayload, unknown: true },
    { ...completePayload, backtest: { ...completePayload.backtest!, positionSizePercent: 101 } },
    { ...completePayload, etf: { name: 'Bad', rebalanceFrequency: 'never', tickers: [{ ticker: 'AAPL', targetWeight: 99 }] } },
  ])('rejects unsupported or malformed payloads without partial mutation', (payload) => {
    const beforeUI = { ...useUIStore.getState() };
    const beforeCash = usePortfolioStore.getState().cash;
    expect(applySharedState(payload as ShareableStatePayload)).toBe(false);
    expect(useUIStore.getState().mode).toBe(beforeUI.mode);
    expect(useUIStore.getState().selectedTicker).toBe(beforeUI.selectedTicker);
    expect(usePortfolioStore.getState().cash).toBe(beforeCash);
  });

  it('rejects oversized encoded input before parsing', () => {
    expect(decodeShareState('A'.repeat(16_385))).toBeNull();
  });
});

describe('saved ETF persistence', () => {
  it('writes a versioned, validated record and rejects malformed ETFs', () => {
    useETFStore.setState({ savedETFs: [], activeETF: null });
    const validETF = {
      id: 'etf_test',
      name: 'Test Fund',
      tickers: [{ ticker: 'AAPL', targetWeight: 100 }],
      rebalanceFrequency: 'never' as const,
      createdAt: '2024-01-02',
    };
    useETFStore.getState().saveETF(validETF);
    expect(JSON.parse(localStorage.getItem('mockmarket_saved_etfs')!)).toEqual({ version: 1, etfs: [validETF] });

    useETFStore.getState().saveETF({ ...validETF, id: '../bad' });
    expect(useETFStore.getState().savedETFs).toEqual([validETF]);
  });

  it('ignores outdated persisted formats during store initialization', async () => {
    localStorage.setItem('mockmarket_saved_etfs', JSON.stringify({
      version: 99,
      etfs: [{ id: 'unsafe', name: 'Outdated', tickers: [], rebalanceFrequency: 'never' }],
    }));
    vi.resetModules();
    const { useETFStore: freshETFStore } = await import('../store');
    expect(freshETFStore.getState().savedETFs).toEqual([]);
  });
});

describe('clipboard and crash recovery', () => {
  beforeEach(() => {
    useUIStore.setState({ mode: 'trade', selectedTicker: 'AAPL', simulationDate: '2024-01-02', toasts: [] });
    usePortfolioStore.getState().resetPortfolio(100_000);
  });

  it('awaits clipboard rejection and presents manual-copy instructions', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    render(<ShareModal isOpen onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    await screen.findByText(/press Ctrl\+C or Command\+C/i);
    expect(screen.getByRole('textbox')).toHaveFocus();
    expect(screen.queryByText('Copied')).not.toBeInTheDocument();
  });

  it('shows copy success only after the clipboard promise resolves', async () => {
    let resolveCopy!: () => void;
    const pendingCopy = new Promise<void>((resolve) => { resolveCopy = resolve; });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockReturnValue(pendingCopy) },
    });
    render(<ShareModal isOpen onClose={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    expect(screen.queryByText('Copied')).not.toBeInTheDocument();
    resolveCopy();
    expect(await screen.findByText('Copied')).toBeInTheDocument();
  });

  it('contains a render crash and allows a recovery attempt', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let shouldThrow = true;
    const Child = () => {
      if (shouldThrow) throw new Error('private portfolio contents');
      return <p>Recovered screen</p>;
    };
    render(<AppErrorBoundary><Child /></AppErrorBoundary>);
    expect(screen.getByRole('alert')).toHaveTextContent('could not display this screen');
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(screen.getByText('Recovered screen')).toBeInTheDocument());
    consoleError.mockRestore();
  });
});

describe('privacy-conscious error reporting', () => {
  it('stores only bounded diagnostic metadata in production and transmits nothing', () => {
    vi.stubEnv('PROD', true);
    localStorage.clear();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const id = reportClientError(new Error('AAPL cash=12345 #share=private'), 'window');
    const stored = localStorage.getItem('mockmarket_client_errors_v1') || '';
    expect(id).toMatch(/^err_/);
    expect(stored).toContain('errorType');
    expect(stored).not.toContain('AAPL');
    expect(stored).not.toContain('12345');
    expect(stored).not.toContain('#share');
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
    vi.unstubAllEnvs();
  });
});
