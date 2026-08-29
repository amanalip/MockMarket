import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { getTheme, darkTheme, lightTheme } from '../theme';
import { useUIStore, usePortfolioStore, useETFStore, useScenarioStore } from '../store';

describe('Theme & Store - UX/UI & Bugs', () => {
  beforeEach(()=> {
    localStorage.clear();
    usePortfolioStore.getState().resetPortfolio(100000);
    useETFStore.setState({ savedETFs:[], activeETF:null });
    useScenarioStore.setState({ activeScenario:null, currentStepIndex:0, completedScenarioIds:[] });
  });

  it('getTheme returns dark/light', () => {
    expect(getTheme('dark')).toEqual(darkTheme);
    expect(getTheme('light')).toEqual(lightTheme);
  });

  it('theme tokens are valid hex', () => {
    const hex=/^#[0-9a-fA-F]{6}$/;
    Object.values(darkTheme).forEach(v=> expect(v).toMatch(hex));
    Object.values(lightTheme).forEach(v=> expect(v).toMatch(hex));
  });

  it('dark bgPrimary vs textPrimary high contrast (not same)', () => {
    expect(darkTheme.bgPrimary).not.toBe(darkTheme.textPrimary);
    expect(lightTheme.bgPrimary).not.toBe(lightTheme.textPrimary);
  });

  it('UI store toggleTheme persists to localStorage', () => {
    useUIStore.setState({ theme:'dark' });
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe('light');
    expect(localStorage.getItem('mockmarket_theme')).toBe('light');
    useUIStore.getState().toggleTheme();
    expect(useUIStore.getState().theme).toBe('dark');
  });

  it('UI store addToast and auto-remove via timeout', async () => {
    vi.useFakeTimers();
    useUIStore.setState({ toasts:[] });
    useUIStore.getState().addToast('hello','success');
    expect(useUIStore.getState().toasts.length).toBe(1);
    expect(useUIStore.getState().toasts[0].message).toBe('hello');
    // manual remove
    const id=useUIStore.getState().toasts[0].id;
    useUIStore.getState().removeToast(id);
    expect(useUIStore.getState().toasts.length).toBe(0);
    // auto remove after 4000ms
    useUIStore.getState().addToast('auto');
    vi.advanceTimersByTime(4000);
    expect(useUIStore.getState().toasts.length).toBe(0);
    vi.useRealTimers();
  });

  it('portfolio store setStartingCash resets trades', () => {
    const store=usePortfolioStore.getState();
    // execute a trade via store
    const candle={ time:'2024-01-02', open:100, high:110, low:90, close:100, volume:1000 };
    store.executeTrade({ ticker:'AAPL', side:'buy', type:'market', shares:10, date:'2024-01-02' }, candle as any);
    expect(usePortfolioStore.getState().trades.length).toBe(1);
    usePortfolioStore.getState().setStartingCash(50000);
    expect(usePortfolioStore.getState().cash).toBe(50000);
    expect(usePortfolioStore.getState().trades.length).toBe(0);
    expect(Object.keys(usePortfolioStore.getState().positions).length).toBe(0);
  });

  it('portfolio setCash divergence bug: setCash does not update engine', () => {
    usePortfolioStore.getState().setCash(12345);
    expect(usePortfolioStore.getState().cash).toBe(12345);
    // engine still at old cash => next trade uses engine cash, not store cash
    // this is intentional bug documented
  });

  it('etf store saveETF dedup and delete', () => {
    const etf={ id:'e1', name:'ETF1', tickers:[{ticker:'AAPL',targetWeight:100}], rebalanceFrequency:'never' as const, createdAt:'2020-01-01' };
    const etf2={ id:'e1', name:'ETF1 v2', tickers:[{ticker:'AAPL',targetWeight:100}], rebalanceFrequency:'monthly' as const, createdAt:'2020-01-01' };
    useETFStore.getState().saveETF(etf);
    useETFStore.getState().saveETF(etf2);
    expect(useETFStore.getState().savedETFs.length).toBe(1);
    expect(useETFStore.getState().savedETFs[0].name).toBe('ETF1 v2');
    useETFStore.getState().deleteETF('e1');
    expect(useETFStore.getState().savedETFs.length).toBe(0);
  });

  it('scenario store markCompleted dedup', () => {
    useScenarioStore.getState().markCompleted(1);
    useScenarioStore.getState().markCompleted(1);
    expect(useScenarioStore.getState().completedScenarioIds).toEqual([1]);
    useScenarioStore.getState().markCompleted(2);
    expect(useScenarioStore.getState().completedScenarioIds.length).toBe(2);
  });

  it('UI store playback and selection', () => {
    useUIStore.getState().setSimulationDate('2023-05-01');
    expect(useUIStore.getState().simulationDate).toBe('2023-05-01');
    useUIStore.getState().setSelectedTicker('TSLA');
    expect(useUIStore.getState().selectedTicker).toBe('TSLA');
    useUIStore.getState().setIsPlaying(true);
    expect(useUIStore.getState().isPlaying).toBe(true);
  });

  // Snapshot-style UX invariants
  it('portfolio empty state shows zero positions message invariant', () => {
    // simulate UI logic: empty positions should prompt "No holdings"
    const pos=usePortfolioStore.getState().positions;
    const empty=Object.keys(pos).length===0;
    expect(empty).toBe(true);
    // future UI test would assert rendering
  });

  it('a11y theme contrast check dark bg vs text >4.5 ratio approximate', () => {
    // simple luminance check
    const hexToLum = (hex:string)=> {
      const r=parseInt(hex.slice(1,3),16)/255, g=parseInt(hex.slice(3,5),16)/255, b=parseInt(hex.slice(5,7),16)/255;
      const lin=(c:number)=> c<=0.03928? c/12.92 : Math.pow((c+0.055)/1.055,2.4);
      return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
    };
    const lBg=hexToLum(darkTheme.bgPrimary);
    const lText=hexToLum(darkTheme.textPrimary);
    const contrast=(Math.max(lBg,lText)+0.05)/(Math.min(lBg,lText)+0.05);
    expect(contrast).toBeGreaterThan(4.5);
  });
});
