import { describe, it, expect, vi } from 'vitest';
import { useBacktesterStore, useUIStore } from '../store';
import { CORE_TICKERS, searchTickers } from '../model/tickers';
import { renderHook } from '@testing-library/react';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

describe('Bugfix Batch 14 – Store/Keyboard/Tickers final', () => {
  it('setConfig validates ISO dates and Infinity initialCash', () => {
    const before = { ...useBacktesterStore.getState().config };
    useBacktesterStore.getState().setConfig({ startDate: '2024-02-30' as any, endDate: '2024-01-01' as any });
    // invalid start should be ignored, not swapped to invalid
    expect(useBacktesterStore.getState().config.startDate).toBe(before.startDate);
    expect(useBacktesterStore.getState().config.endDate).toBe(before.endDate);
    // Infinity initialCash should be ignored
    useBacktesterStore.getState().setConfig({ initialCash: Infinity as any });
    expect(useBacktesterStore.getState().config.initialCash).toBe(before.initialCash);
    expect(Number.isFinite(useBacktesterStore.getState().config.initialCash)).toBe(true);
    // valid swap still works
    useBacktesterStore.getState().setConfig({ startDate: '2024-03-01', endDate: '2024-01-01' });
    expect(useBacktesterStore.getState().config.startDate).toBe('2024-01-01');
    expect(useBacktesterStore.getState().config.endDate).toBe('2024-03-01');
    // restore
    useBacktesterStore.getState().setConfig(before);
  });

  it('keyboard ignores repeat and nested contentEditable', () => {
    const onToggle = vi.fn();
    const onAdvance = vi.fn();
    const { unmount } = renderHook(() => useKeyboardShortcuts({ onToggleShortcutsModal: onToggle, onAdvanceOneDay: onAdvance }));
    // repeat should be ignored
    const repeatEvent = new KeyboardEvent('keydown', { key: 'ArrowRight', repeat: true });
    window.dispatchEvent(repeatEvent);
    expect(onAdvance).not.toHaveBeenCalled();
    // nested contentEditable: span inside div
    const parent = document.createElement('div');
    parent.contentEditable = 'true';
    const child = document.createElement('span');
    child.textContent = 'hello';
    parent.appendChild(child);
    document.body.appendChild(parent);
    child.focus();
    // JSDOM activeElement will be child, isContentEditable false, but parent is editable
    // Our fix checks closest('[contenteditable="true"]')
    const tEvent = new KeyboardEvent('keydown', { key: 't' });
    const toggleSpy = vi.fn();
    const origToggle = useUIStore.getState().toggleTheme;
    useUIStore.setState({ toggleTheme: toggleSpy } as any);
    window.dispatchEvent(tEvent);
    // should be ignored due to nested editable, but JSDOM may not support closest correctly for activeElement
    // At least ensure not throwing and that repeat is ignored
    expect(toggleSpy).not.toHaveBeenCalled(); // if nested detection works, otherwise this may fail in JSDOM
    document.body.removeChild(parent);
    unmount();
    useUIStore.setState({ toggleTheme: origToggle } as any);
  });

  it('CORE_TICKERS frozen prevents push pollution', () => {
    const beforeLen = CORE_TICKERS.length;
    const beforeSearchLen = searchTickers('').length;
    try {
      (CORE_TICKERS as any).push({ ticker: 'FAKE', name: 'Fake' } as any);
    } catch {}
    expect(CORE_TICKERS.length).toBe(beforeLen);
    expect(searchTickers('').length).toBe(beforeSearchLen);
    expect(searchTickers('FAKE').length).toBe(0);
  });

  it('store setSelectedTicker already hardened but retest', () => {
    useUIStore.getState().setSelectedTicker('  aapl  ');
    expect(useUIStore.getState().selectedTicker).toBe('AAPL');
  });

  it('store setMode validation still holds', () => {
    const before = useUIStore.getState().mode;
    // @ts-expect-error invalid mode test
    useUIStore.getState().setMode('invalid');
    expect(useUIStore.getState().mode).toBe(before);
  });
});
