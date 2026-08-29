import { describe, it, expect } from 'vitest';
import { getTheme, darkTheme, lightTheme } from '../theme';
import { useUIStore, usePortfolioStore } from '../store';

describe('Misc 6 - Final 550', () => {
  it('theme getTheme light', () => {
    expect(getTheme('light')).toEqual(lightTheme);
  });

  it('theme dark bgPrimary', () => {
    expect(darkTheme.bgPrimary).toBe('#0b0f19');
  });

  it('store UI toggle theme', () => {
    const before = useUIStore.getState().theme;
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).not.toBe(before);
    useUIStore.getState().toggleTheme();
  });

  it('store portfolio reset', () => {
    usePortfolioStore.getState().resetPortfolio(100000);
    expect(usePortfolioStore.getState().cash).toBe(100000);
  });

  it('portfolio total value after reset', () => {
    usePortfolioStore.getState().resetPortfolio(100000);
    expect(usePortfolioStore.getState().positions).toEqual({});
  });

  it('light theme accent', () => {
    expect(lightTheme.accent).toBe('#2563eb');
  });
});
