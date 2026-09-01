import { useEffect } from 'react';
import { useUIStore } from '../store';
import { AppMode } from '../model/types';

interface KeyboardShortcutsOptions {
  onToggleShortcutsModal: () => void;
  onAdvanceOneDay?: () => void;
}

export function useKeyboardShortcuts({
  onToggleShortcutsModal,
  onAdvanceOneDay,
}: KeyboardShortcutsOptions) {
  const { setMode, toggleTheme, setIsPlaying } = useUIStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      // Ignore auto-repeat
      if (e.repeat) return;
      // Ignore if user is currently typing in an input, textarea, select, or contenteditable (including nested)
      const activeEl = document.activeElement as HTMLElement | null;
      const activeTag = activeEl?.tagName.toLowerCase();
      const isEditable = activeEl?.isContentEditable || !!activeEl?.closest?.('[contenteditable="true"]');
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select' || isEditable) {
        return;
      }
      // Don't hijack browser shortcuts
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key;

      if (key === '?' || (e.shiftKey && key === '/')) {
        e.preventDefault();
        onToggleShortcutsModal();
        return;
      }

      if (key === 't' || key === 'T') {
        e.preventDefault();
        toggleTheme();
        return;
      }

      if (key === 'b' || key === 'B' || key === 's' || key === 'S') {
        const tabId = key.toLowerCase() === 'b' ? 'trade-buy-tab' : 'trade-sell-tab';
        const tab = document.getElementById(tabId) as HTMLButtonElement | null;
        if (tab) {
          e.preventDefault();
          tab.click();
          tab.focus();
        }
        return;
      }

      if (key === ' ') {
        // Ignore space when focused on button to avoid double toggle
        if (activeTag === 'button') return;
        e.preventDefault();
        // Use functional update to avoid stale closure
        const current = useUIStore.getState().isPlaying;
        setIsPlaying(!current);
        return;
      }

      if (key === 'ArrowRight' && onAdvanceOneDay) {
        const overflowX = activeEl ? getComputedStyle(activeEl).overflowX : '';
        const canScrollHorizontally = !!activeEl
          && activeEl.scrollWidth > activeEl.clientWidth
          && (overflowX === 'auto' || overflowX === 'scroll');
        if (canScrollHorizontally) return;
        e.preventDefault();
        onAdvanceOneDay();
        return;
      }

      // Tab navigation
      const modeMap: Record<string, AppMode> = {
        '1': 'trade',
        '2': 'backtest',
        '3': 'etf',
        '4': 'scenarios',
        '5': 'timeline',
      };

      if (modeMap[key]) {
        e.preventDefault();
        setMode(modeMap[key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setMode, toggleTheme, setIsPlaying, onToggleShortcutsModal, onAdvanceOneDay]);
}
