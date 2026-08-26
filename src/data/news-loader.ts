import { HistoricalNewsEvent, NewsCategory, NewsSentiment } from '../model/types';
import newsData from './news.json';

const allNews: HistoricalNewsEvent[] = newsData as HistoricalNewsEvent[];

export function getAllHistoricalNews(): HistoricalNewsEvent[] {
  return allNews;
}

export function getNewsUpToDate(date: string): HistoricalNewsEvent[] {
  return allNews.filter((n) => n.date <= date);
}

export function getNewsByDate(date: string): HistoricalNewsEvent[] {
  return allNews.filter((n) => n.date === date);
}

export interface NewsFilterOptions {
  category?: NewsCategory | 'all';
  sentiment?: NewsSentiment | 'all';
  ticker?: string;
  query?: string;
}

export function filterNewsEvents(
  events: HistoricalNewsEvent[],
  options: NewsFilterOptions
): HistoricalNewsEvent[] {
  return events.filter((item) => {
    if (options.category && options.category !== 'all' && item.category !== options.category) {
      return false;
    }
    if (options.sentiment && options.sentiment !== 'all' && item.sentiment !== options.sentiment) {
      return false;
    }
    if (options.ticker && !item.affectedTickers.includes(options.ticker.toUpperCase())) {
      return false;
    }
    if (options.query) {
      const q = options.query.toLowerCase();
      const matchHead = item.headline.toLowerCase().includes(q);
      const matchSumm = item.summary.toLowerCase().includes(q);
      const matchTicker = item.affectedTickers.some((t) => t.toLowerCase().includes(q));
      if (!matchHead && !matchSumm && !matchTicker) {
        return false;
      }
    }
    return true;
  });
}
