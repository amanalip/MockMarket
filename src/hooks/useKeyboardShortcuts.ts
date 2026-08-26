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
  const { setMode, toggleTheme, isPlaying, setIsPlaying } = useUIStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input, textarea, or select
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
        return;
      }

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

      if (key === ' ') {
        e.preventDefault();
        setIsPlaying(!isPlaying);
        return;
      }

      if (key === 'ArrowRight' && onAdvanceOneDay) {
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
  }, [setMode, toggleTheme, isPlaying, setIsPlaying, onToggleShortcutsModal, onAdvanceOneDay]);
}
