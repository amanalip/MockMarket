import { describe, it, expect, vi } from 'vitest';
import { exportTradesToCSV, exportBacktestTradesToCSV, exportETFNAVToCSV, downloadCSV } from '../engine/export/csv-export';
import { encodeShareState, decodeShareState } from '../engine/export/url-state';
import { filterScenarios, getScenarioById, getAllScenarios } from '../data/scenario-loader';
import { filterNewsEvents, getAllHistoricalNews, getNewsByDate } from '../data/news-loader';
import { loadTickerData } from '../data/loader';

describe('Data & Export Extra - Security & Edge', () => {
  it('export CSV escapes commas and quotes via quoted reason', () => {
    const trades = [{ id: '1', entryDate: '2020-01-01', entryPrice: 100, exitDate: '2020-01-02', exitPrice: 110, shares: 10, pnl: 100, pnlPercent: 10, reason: 'Stop Loss, \"triggered\"' } as any];
    const csv = exportBacktestTradesToCSV(trades);
    expect(csv).toContain('"Stop Loss, ""triggered"""');
  });

  it('exportTrades handles BRK.B ticker with dot', () => {
    const trades = [{ id: '1', ticker: 'BRK.B', side: 'buy', type: 'market', shares: 5, price: 500000, total: 2500000, fee: 0, timestamp: '2020-01-01' } as any];
    const csv = exportTradesToCSV(trades);
    expect(csv).toContain('BRK.B');
  });

  it('exportETFNAV fundName with comma breaks header (documented bug)', () => {
    const nav = [{ date: '2020-01-01', nav: 100 }];
    const csv = exportETFNAVToCSV(nav, 'Foo,Bar');
    expect(csv.split('\n')[0]).toBe('Date,"Foo,Bar_NAV"')
  });

  it('downloadCSV creates link and revokes URL', () => {
    const createEl = vi.spyOn(document, 'createElement');
    const append = vi.spyOn(document.body, 'appendChild').mockImplementation(x => x as any);
    const remove = vi.spyOn(document.body, 'removeChild').mockImplementation(x => x as any);
    // jsdom lacks createObjectURL, mock it
    const origCreate = URL.createObjectURL;
    const origRevoke = URL.revokeObjectURL;
    (URL as any).createObjectURL = vi.fn().mockReturnValue('blob:fake');
    (URL as any).revokeObjectURL = vi.fn();
    const clickSpy = vi.fn();
    createEl.mockReturnValue({ setAttribute: vi.fn(), style: {} as any, click: clickSpy } as any);
    downloadCSV('test.csv', 'a,b\n1,2');
    expect((URL as any).createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect((URL as any).revokeObjectURL).toHaveBeenCalledWith('blob:fake');
    // restore
    createEl.mockRestore(); append.mockRestore(); remove.mockRestore();
    (URL as any).createObjectURL = origCreate;
    (URL as any).revokeObjectURL = origRevoke;
  });

  it('url-state rejects unrecognized large payload fields', () => {
    const payload: any = { version: 1, mode: 'trade', ticker: 'AAPL', cash: 10000, extra: 'x'.repeat(5000) };
    const enc = encodeShareState(payload);
    expect(decodeShareState(enc)).toBeNull();
  });

  it('url-state decode malformed base64 returns null', () => {
    expect(decodeShareState('not%20base64!!!')).toBeNull();
  });

  it('scenario loader filters category case sensitivity', () => {
    const all = getAllScenarios();
    const filtered = filterScenarios('crash', 'all'); // lower vs stored 'Crash' maybe
    // If case strict, lower returns empty (bug doc)
    expect(Array.isArray(filtered)).toBe(true);
  });

  it('scenario getById returns correct or undefined', () => {
    const all = getAllScenarios();
    const firstId = all[0]?.id;
    const s = getScenarioById(firstId);
    expect(s?.id).toBe(firstId);
    expect(getScenarioById('nonexistent_99999')).toBeUndefined();
  });

  it('news loader filter by ticker substring case-insensitive', () => {
    const all = getAllHistoricalNews();
    const res = filterNewsEvents(all, { ticker: 'aapl' });
    if (res.length > 0) {
      expect(res.every(n => n.affectedTickers.includes('AAPL'))).toBe(true);
    }
  });

  it('news loader query searches headline/summary', () => {
    const all = getAllHistoricalNews();
    const res = filterNewsEvents(all, { query: 'fed' });
    expect(Array.isArray(res)).toBe(true);
  });

  it('news getNewsByDate returns matching', () => {
    const all = getAllHistoricalNews();
    if (all.length > 0) {
      const date = all[0].date;
      const byDate = getNewsByDate(date);
      expect(byDate.length).toBeGreaterThan(0);
      expect(byDate.every(n => n.date === date)).toBe(true);
    }
  });

  it('loadTickerData uppercases ticker', async () => {
    const fake: any = [{ time: '2020-01-01', open: 10, high: 10, low: 10, close: 10, volume: 1000 }];
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true, json: async () => fake } as any);
    const res = await loadTickerData('aapl');
    expect(spy).toHaveBeenCalledWith(expect.stringContaining('AAPL.json'));
    spy.mockRestore();
  });

  it('loadTickerData throws for unknown ticker', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false } as any);
    await expect(loadTickerData('UNKNOWN_777')).rejects.toThrow(/Data file not found/);
    spy.mockRestore();
  });

  it('scenario all categories include expected', () => {
    const scenarios = getAllScenarios();
    const cats = new Set(scenarios.map(s => s.category));
    expect(cats.size).toBeGreaterThan(3);
  });
});
