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
  if (!Array.isArray(events)) return [];
  const cat = options.category?.trim().toLowerCase();
  const sent = options.sentiment?.trim().toLowerCase();
  const ticker = options.ticker?.trim().toUpperCase();
  const query = options.query?.trim().toLowerCase();
  return events.filter((item) => {
    if (cat && cat !== 'all' && item.category.toLowerCase() !== cat) {
      return false;
    }
    if (sent && sent !== 'all' && item.sentiment.toLowerCase() !== sent) {
      return false;
    }
    if (ticker && !item.affectedTickers.map((t) => t.toUpperCase()).includes(ticker)) {
      return false;
    }
    if (query) {
      const q = query;
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
