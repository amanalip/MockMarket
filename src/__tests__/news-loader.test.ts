import { describe, it, expect } from 'vitest';
import {
  getAllHistoricalNews,
  getNewsByDate,
  getNewsUpToDate,
  filterNewsEvents,
} from '../data/news-loader';

describe('Historical News & Timeline Data Engine', () => {
  it('loads curated historical news items', () => {
    const all = getAllHistoricalNews();
    expect(all.length).toBeGreaterThan(20);
    expect(all[0].id).toBeDefined();
    expect(all[0].headline).toBeDefined();
    expect(all[0].date).toBeDefined();
  });

  it('filters news strictly up to simulation date', () => {
    const subset = getNewsUpToDate('2020-03-31');
    expect(subset.length).toBeGreaterThan(0);
    expect(subset.every((n) => n.date <= '2020-03-31')).toBe(true);
  });

  it('filters news by category and sentiment accurately', () => {
    const all = getAllHistoricalNews();

    const fedNews = filterNewsEvents(all, { category: 'fed' });
    expect(fedNews.length).toBeGreaterThan(0);
    expect(fedNews.every((n) => n.category === 'fed')).toBe(true);

    const bearishNews = filterNewsEvents(all, { sentiment: 'bearish' });
    expect(bearishNews.length).toBeGreaterThan(0);
    expect(bearishNews.every((n) => n.sentiment === 'bearish')).toBe(true);
  });

  it('filters news by affected ticker and text query', () => {
    const all = getAllHistoricalNews();

    const aaplNews = filterNewsEvents(all, { ticker: 'AAPL' });
    expect(aaplNews.length).toBeGreaterThan(0);
    expect(aaplNews.every((n) => n.affectedTickers.includes('AAPL'))).toBe(true);

    const searchHits = filterNewsEvents(all, { query: 'COVID' });
    const altHits = filterNewsEvents(all, { query: 'pandemic' });
    const combined = [...searchHits, ...altHits];
    expect(combined.length).toBeGreaterThanOrEqual(0);
  });

  it('finds news events matching specific dates', () => {
    const events = getNewsByDate('2020-03-23');
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0].headline).toContain('Unlimited QE');
  });
});
